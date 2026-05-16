from sqlalchemy.orm import Session
from datetime import datetime
from models import User, Flight, Booking
from schemas import BookingOut, ErrorResponse, SeatClass


# Price multipliers for each seat class
SEAT_CLASS_MULTIPLIERS = {
    'economy': 1.0,
    'business': 2.5,
    'galaxium': 5.0
}

SEATED_INFANT_DISCOUNT = 0.5


def _get_class_seats_available(flight: Flight, seat_class: SeatClass) -> int:
    """Get remaining seats for a seat class."""
    if seat_class == 'economy':
        return flight.economy_seats_available
    if seat_class == 'business':
        return flight.business_seats_available
    return flight.galaxium_seats_available


def _adjust_class_seats(flight: Flight, seat_class: SeatClass, delta: int) -> None:
    """Adjust remaining seats for a seat class."""
    if seat_class == 'economy':
        flight.economy_seats_available += delta
    elif seat_class == 'business':
        flight.business_seats_available += delta
    else:
        flight.galaxium_seats_available += delta


def _validate_user(db: Session, user_id: int, name: str) -> User | ErrorResponse:
    """Validate user identity for booking operations."""
    user = db.query(User).filter(User.user_id == user_id, User.name == name).first()
    if user:
        return user

    existing_user = db.query(User).filter(User.user_id == user_id).first()
    if existing_user:
        return ErrorResponse(
            error="Name mismatch",
            error_code="NAME_MISMATCH",
            details=f"User ID {user_id} exists but the name '{name}' does not match the registered name '{existing_user.name}'. Please verify the user's name or use the correct name for this user ID."
        )

    return ErrorResponse(
        error="User not found",
        error_code="USER_NOT_FOUND",
        details=f"User with ID {user_id} is not registered in our system. The user might need to register first, or you may need to check if the user_id is correct."
    )


def _calculate_booking_pricing(base_seat_price: int, adult_count: int, lap_infant_count: int, seated_infant_count: int) -> tuple[int, int, int, int]:
    """Calculate booking pricing with one infant special fare allowed."""
    total_infants = lap_infant_count + seated_infant_count
    special_infants = 1 if total_infants > 0 else 0

    discounted_seated_infants = min(seated_infant_count, special_infants)
    remaining_special_infants = special_infants - discounted_seated_infants
    free_lap_infants = min(lap_infant_count, remaining_special_infants)

    full_fare_seated_infants = seated_infant_count - discounted_seated_infants
    full_fare_lap_infants = lap_infant_count - free_lap_infants

    adult_price_paid = base_seat_price * adult_count
    seated_infant_price_paid = int(base_seat_price * SEATED_INFANT_DISCOUNT) * discounted_seated_infants
    seated_infant_price_paid += base_seat_price * full_fare_seated_infants
    lap_infant_price_paid = base_seat_price * full_fare_lap_infants
    total_price_paid = adult_price_paid + seated_infant_price_paid + lap_infant_price_paid

    return total_price_paid, adult_price_paid, lap_infant_price_paid, seated_infant_price_paid


def book_flight(
    db: Session,
    user_id: int,
    name: str,
    flight_id: int,
    seat_class: SeatClass = 'economy',
    adult_count: int = 1,
    lap_infant_count: int = 0,
    seated_infant_count: int = 0
) -> BookingOut | ErrorResponse:
    """Book a seat on a specific flight for a user in the specified seat class."""
    if seat_class not in SEAT_CLASS_MULTIPLIERS:
        return ErrorResponse(
            error="Invalid seat class",
            error_code="INVALID_SEAT_CLASS",
            details=f"Seat class '{seat_class}' is not valid. Valid options are: economy, business, galaxium."
        )

    if adult_count < 1:
        return ErrorResponse(
            error="Adult required",
            error_code="ADULT_REQUIRED",
            details="At least one adult is required for every booking."
        )

    if lap_infant_count < 0 or seated_infant_count < 0:
        return ErrorResponse(
            error="Invalid infant count",
            error_code="INVALID_INFANT_COUNT",
            details="Infant counts cannot be negative."
        )

    flight = db.query(Flight).filter(Flight.flight_id == flight_id).first()
    if not flight:
        return ErrorResponse(
            error="Flight not found",
            error_code="FLIGHT_NOT_FOUND",
            details=f"The specified flight_id {flight_id} does not exist in our system. Please check the flight_id or use list_flights to see available flights."
        )

    user = _validate_user(db, user_id, name)
    if isinstance(user, ErrorResponse):
        return user

    seats_required = adult_count + seated_infant_count
    seats_available = _get_class_seats_available(flight, seat_class)
    if seats_available < seats_required:
        return ErrorResponse(
            error=f"Not enough {seat_class} seats available",
            error_code="NO_SEATS_AVAILABLE",
            details=f"The flight has only {seats_available} available seats in {seat_class} class, but this booking requires {seats_required} seats."
        )

    base_seat_price = int(flight.base_price * SEAT_CLASS_MULTIPLIERS[seat_class])
    price_paid, adult_price_paid, lap_infant_price_paid, seated_infant_price_paid = _calculate_booking_pricing(
        base_seat_price=base_seat_price,
        adult_count=adult_count,
        lap_infant_count=lap_infant_count,
        seated_infant_count=seated_infant_count
    )

    _adjust_class_seats(flight, seat_class, -seats_required)

    new_booking = Booking(
        user_id=user_id,
        flight_id=flight_id,
        status="booked",
        booking_time=datetime.utcnow().isoformat(),
        seat_class=seat_class,
        price_paid=price_paid,
        adult_count=adult_count,
        lap_infant_count=lap_infant_count,
        seated_infant_count=seated_infant_count,
        adult_price_paid=adult_price_paid,
        lap_infant_price_paid=lap_infant_price_paid,
        seated_infant_price_paid=seated_infant_price_paid
    )
    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)
    return BookingOut.model_validate(new_booking)


def cancel_booking(db: Session, booking_id: int) -> BookingOut | ErrorResponse:
    """Cancel an existing booking by its booking_id and restore seat to correct class."""
    booking = db.query(Booking).filter(Booking.booking_id == booking_id).first()
    if not booking:
        return ErrorResponse(
            error="Booking not found",
            error_code="BOOKING_NOT_FOUND",
            details=f"Booking with ID {booking_id} not found. The booking may have been deleted or the booking_id may be incorrect. Please verify the booking_id or check if the booking exists."
        )

    if booking.status == "cancelled":
        return ErrorResponse(
            error="Booking already cancelled",
            error_code="ALREADY_CANCELLED",
            details=f"Booking {booking_id} is already cancelled and cannot be cancelled again. The booking status is currently '{booking.status}'. If you need to make changes, please contact support."
        )

    # Restore seat to the correct class
    flight = db.query(Flight).filter(Flight.flight_id == booking.flight_id).first()
    if flight:
        seats_to_restore = booking.adult_count + booking.seated_infant_count
        _adjust_class_seats(flight, booking.seat_class, seats_to_restore)

    booking.status = "cancelled"
    db.commit()
    db.refresh(booking)
    return BookingOut.model_validate(booking)


def upgrade_booking(db: Session, booking_id: int, new_seat_class: SeatClass) -> BookingOut | ErrorResponse:
    """Upgrade an existing booking to a higher seat class."""
    # Validate seat class
    if new_seat_class not in SEAT_CLASS_MULTIPLIERS:
        return ErrorResponse(
            error="Invalid seat class",
            error_code="INVALID_SEAT_CLASS",
            details=f"Seat class '{new_seat_class}' is not valid. Valid options are: economy, business, galaxium."
        )
    
    # Get the booking
    booking = db.query(Booking).filter(Booking.booking_id == booking_id).first()
    if not booking:
        return ErrorResponse(
            error="Booking not found",
            error_code="BOOKING_NOT_FOUND",
            details=f"Booking with ID {booking_id} not found."
        )
    
    # Check if booking is active
    if booking.status != "booked":
        return ErrorResponse(
            error="Cannot upgrade cancelled booking",
            error_code="INVALID_BOOKING_STATUS",
            details=f"Booking {booking_id} has status '{booking.status}' and cannot be upgraded. Only active bookings can be upgraded."
        )

    if booking.lap_infant_count > 0 or booking.seated_infant_count > 0:
        return ErrorResponse(
            error="Cannot upgrade infant booking",
            error_code="INFANT_BOOKING_UPGRADE_NOT_SUPPORTED",
            details="Bookings that include infants cannot be upgraded in this version."
        )
    
    # Check if it's actually an upgrade (not a downgrade)
    class_hierarchy = {'economy': 1, 'business': 2, 'galaxium': 3}
    current_level = class_hierarchy.get(booking.seat_class, 0)
    new_level = class_hierarchy.get(new_seat_class, 0)
    
    if new_level <= current_level:
        return ErrorResponse(
            error="Not an upgrade",
            error_code="INVALID_UPGRADE",
            details=f"Cannot change from {booking.seat_class} to {new_seat_class}. You can only upgrade to a higher class."
        )
    
    # Get the flight
    flight = db.query(Flight).filter(Flight.flight_id == booking.flight_id).first()
    if not flight:
        return ErrorResponse(
            error="Flight not found",
            error_code="FLIGHT_NOT_FOUND",
            details=f"Flight {booking.flight_id} not found."
        )
    
    # Check if new seat class has availability
    seats_available = _get_class_seats_available(flight, new_seat_class)
    seats_required = booking.adult_count + booking.seated_infant_count

    if seats_available < seats_required:
        return ErrorResponse(
            error=f"No {new_seat_class} seats available",
            error_code="NO_SEATS_AVAILABLE",
            details=f"The flight has only {seats_available} available seats in {new_seat_class} class, but this booking requires {seats_required} seats."
        )

    _adjust_class_seats(flight, booking.seat_class, seats_required)
    _adjust_class_seats(flight, new_seat_class, -seats_required)

    new_base_seat_price = int(flight.base_price * SEAT_CLASS_MULTIPLIERS[new_seat_class])
    new_price, adult_price_paid, lap_infant_price_paid, seated_infant_price_paid = _calculate_booking_pricing(
        base_seat_price=new_base_seat_price,
        adult_count=booking.adult_count,
        lap_infant_count=booking.lap_infant_count,
        seated_infant_count=booking.seated_infant_count
    )

    booking.seat_class = new_seat_class
    booking.price_paid = new_price
    booking.adult_price_paid = adult_price_paid
    booking.lap_infant_price_paid = lap_infant_price_paid
    booking.seated_infant_price_paid = seated_infant_price_paid
    
    db.commit()
    db.refresh(booking)
    return BookingOut.model_validate(booking)


def get_bookings(db: Session, user_id: int) -> list[BookingOut]:
    """Retrieve all bookings for a specific user."""
    bookings = db.query(Booking).filter(Booking.user_id == user_id).all()
    return [BookingOut.model_validate(b) for b in bookings]


def get_booking_count(db: Session, user_id: int) -> int | ErrorResponse:
    """Get the number of bookings for a user."""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        return ErrorResponse(
            error="User not found",
            error_code="USER_NOT_FOUND",
            details=f"User with ID {user_id} not found."
        )

    return db.query(Booking).filter(Booking.user_id == user_id).count()
