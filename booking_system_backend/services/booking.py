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


def _seat_count_for_booking(seated_infant_count: int, adult_count: int) -> int:
    """Return total seats required for a booking."""
    return adult_count + seated_infant_count


def _available_seats_for_class(flight: Flight, seat_class: str) -> int:
    """Return available seats for a seat class."""
    if seat_class == 'economy':
        return flight.economy_seats_available
    if seat_class == 'business':
        return flight.business_seats_available
    return flight.galaxium_seats_available


def _adjust_seats(flight: Flight, seat_class: str, change: int) -> None:
    """Adjust seat inventory for a seat class."""
    if seat_class == 'economy':
        flight.economy_seats_available += change
    elif seat_class == 'business':
        flight.business_seats_available += change
    else:
        flight.galaxium_seats_available += change


def _price_breakdown(base_price: int, seat_class: str, adult_count: int, lap_infant_count: int, seated_infant_count: int) -> tuple[int, int, int, int]:
    """Return total and component pricing for a booking."""
    seat_price = int(base_price * SEAT_CLASS_MULTIPLIERS[seat_class])
    adult_total = seat_price * adult_count
    lap_infant_total = seat_price if lap_infant_count > 0 else 0
    seated_infant_total = seat_price * seated_infant_count
    total_price = adult_total + lap_infant_total + seated_infant_total
    return total_price, adult_total, lap_infant_total, seated_infant_total


def book_flight(db: Session, user_id: int, name: str, flight_id: int, seat_class: SeatClass = 'economy') -> BookingOut | ErrorResponse:
    """Book a seat on a specific flight for a user in the specified seat class."""
    # Validate seat class
    if seat_class not in SEAT_CLASS_MULTIPLIERS:
        return ErrorResponse(
            error="Invalid seat class",
            error_code="INVALID_SEAT_CLASS",
            details=f"Seat class '{seat_class}' is not valid. Valid options are: economy, business, galaxium."
        )
    
    # Check flight exists
    flight = db.query(Flight).filter(Flight.flight_id == flight_id).first()
    if not flight:
        return ErrorResponse(
            error="Flight not found",
            error_code="FLIGHT_NOT_FOUND",
            details=f"The specified flight_id {flight_id} does not exist in our system. Please check the flight_id or use list_flights to see available flights."
        )

    # Check seats available for the specific class
    if seat_class == 'economy':
        seats_available = flight.economy_seats_available
    elif seat_class == 'business':
        seats_available = flight.business_seats_available
    else:  # galaxium
        seats_available = flight.galaxium_seats_available
    
    if seats_available < 1:
        return ErrorResponse(
            error=f"No {seat_class} seats available",
            error_code="NO_SEATS_AVAILABLE",
            details=f"The flight has no available seats in {seat_class} class. Please try a different class or check other flights."
        )

    # Check user exists and name matches
    user = db.query(User).filter(User.user_id == user_id, User.name == name).first()
    if not user:
        existing_user = db.query(User).filter(User.user_id == user_id).first()
        if existing_user:
            return ErrorResponse(
                error="Name mismatch",
                error_code="NAME_MISMATCH",
                details=f"User ID {user_id} exists but the name '{name}' does not match the registered name '{existing_user.name}'. Please verify the user's name or use the correct name for this user ID."
            )
        else:
            return ErrorResponse(
                error="User not found",
                error_code="USER_NOT_FOUND",
                details=f"User with ID {user_id} is not registered in our system. The user might need to register first, or you may need to check if the user_id is correct."
            )

    # Calculate price based on seat class
    price_paid = int(flight.base_price * SEAT_CLASS_MULTIPLIERS[seat_class])

    # Decrement the correct seat class counter
    if seat_class == 'economy':
        flight.economy_seats_available -= 1
    elif seat_class == 'business':
        flight.business_seats_available -= 1
    else:  # galaxium
        flight.galaxium_seats_available -= 1

    # Create booking
    new_booking = Booking(
        user_id=user_id,
        flight_id=flight_id,
        status="booked",
        booking_time=datetime.utcnow().isoformat(),
        seat_class=seat_class,
        price_paid=price_paid
    )
    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)
    return BookingOut.model_validate(new_booking)


def modify_booking(
    db: Session,
    booking_id: int,
    seat_class: SeatClass,
    adult_count: int,
    lap_infant_count: int,
    seated_infant_count: int
) -> BookingOut | ErrorResponse:
    """Modify an existing booking with new seat class and passenger counts."""
    if seat_class not in SEAT_CLASS_MULTIPLIERS:
        return ErrorResponse(
            error="Invalid seat class",
            error_code="INVALID_SEAT_CLASS",
            details=f"Seat class '{seat_class}' is not valid. Valid options are: economy, business, galaxium."
        )

    if adult_count < 1:
        return ErrorResponse(
            error="Invalid passenger count",
            error_code="INVALID_ADULT_COUNT",
            details="At least one adult passenger is required."
        )

    if lap_infant_count < 0 or seated_infant_count < 0:
        return ErrorResponse(
            error="Invalid infant count",
            error_code="INVALID_INFANT_COUNT",
            details="Infant counts cannot be negative."
        )

    existing_booking = db.query(Booking).filter(Booking.booking_id == booking_id).first()
    if not existing_booking:
        return ErrorResponse(
            error="Booking not found",
            error_code="BOOKING_NOT_FOUND",
            details=f"Booking with ID {booking_id} not found. The booking may have been deleted or the booking_id may be incorrect. Please verify the booking_id or check if the booking exists."
        )

    if existing_booking.status != "booked":
        return ErrorResponse(
            error="Booking cannot be modified",
            error_code="BOOKING_NOT_ACTIVE",
            details=f"Only active booked reservations can be modified. Booking {booking_id} has status '{existing_booking.status}'."
        )

    flight = db.query(Flight).filter(Flight.flight_id == existing_booking.flight_id).first()
    if not flight:
        return ErrorResponse(
            error="Flight not found",
            error_code="FLIGHT_NOT_FOUND",
            details=f"The flight for booking {booking_id} no longer exists."
        )

    current_seats = _seat_count_for_booking(existing_booking.seated_infant_count, existing_booking.adult_count)
    requested_seats = _seat_count_for_booking(seated_infant_count, adult_count)

    available_after_release = _available_seats_for_class(flight, seat_class)
    if seat_class == existing_booking.seat_class:
        available_after_release += current_seats

    if available_after_release < requested_seats:
        return ErrorResponse(
            error=f"No {seat_class} seats available",
            error_code="NO_SEATS_AVAILABLE",
            details=f"The flight does not have enough {seat_class} seats for this modification. Requested {requested_seats}, available {available_after_release}."
        )

    _adjust_seats(flight, existing_booking.seat_class, current_seats)
    _adjust_seats(flight, seat_class, -requested_seats)

    total_price, adult_price_paid, lap_infant_price_paid, seated_infant_price_paid = _price_breakdown(
        flight.base_price,
        seat_class,
        adult_count,
        lap_infant_count,
        seated_infant_count
    )

    existing_booking.seat_class = seat_class
    existing_booking.adult_count = adult_count
    existing_booking.lap_infant_count = lap_infant_count
    existing_booking.seated_infant_count = seated_infant_count
    existing_booking.price_paid = total_price
    existing_booking.adult_price_paid = adult_price_paid
    existing_booking.lap_infant_price_paid = lap_infant_price_paid
    existing_booking.seated_infant_price_paid = seated_infant_price_paid

    db.commit()
    db.refresh(existing_booking)
    return BookingOut.model_validate(existing_booking)


def upgrade_booking(db: Session, booking_id: int, new_seat_class: SeatClass) -> BookingOut | ErrorResponse:
    """Upgrade an existing booking to a higher seat class."""
    current_booking = db.query(Booking).filter(Booking.booking_id == booking_id).first()
    if not current_booking:
        return ErrorResponse(
            error="Booking not found",
            error_code="BOOKING_NOT_FOUND",
            details=f"Booking with ID {booking_id} not found. The booking may have been deleted or the booking_id may be incorrect. Please verify the booking_id or check if the booking exists."
        )

    current_rank = {"economy": 1, "business": 2, "galaxium": 3}
    if new_seat_class == current_booking.seat_class:
        return ErrorResponse(
            error="Booking already in requested class",
            error_code="ALREADY_IN_SEAT_CLASS",
            details=f"Booking {booking_id} is already in {new_seat_class} class."
        )

    if current_rank.get(new_seat_class, 0) < current_rank.get(current_booking.seat_class, 0):
        return ErrorResponse(
            error="Downgrade not allowed",
            error_code="DOWNGRADE_NOT_ALLOWED",
            details=f"Cannot change booking from {current_booking.seat_class} to lower class {new_seat_class} through upgrade. Use modify booking instead."
        )

    return modify_booking(
        db,
        booking_id,
        new_seat_class,
        current_booking.adult_count,
        current_booking.lap_infant_count,
        current_booking.seated_infant_count
    )


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
        if booking.seat_class == 'economy':
            flight.economy_seats_available += 1
        elif booking.seat_class == 'business':
            flight.business_seats_available += 1
        elif booking.seat_class == 'galaxium':
            flight.galaxium_seats_available += 1

    booking.status = "cancelled"
    db.commit()
    db.refresh(booking)
    return BookingOut.model_validate(booking)


def get_bookings(db: Session, user_id: int) -> list[BookingOut]:
    """Retrieve all bookings for a specific user."""
    bookings = db.query(Booking).filter(Booking.user_id == user_id).all()
    return [BookingOut.model_validate(b) for b in bookings]
