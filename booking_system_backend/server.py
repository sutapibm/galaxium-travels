from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastmcp import FastMCP
from sqlalchemy.orm import Session
from typing import Union, Optional
from dotenv import load_dotenv
import os
import httpx
from db import SessionLocal, init_db, get_db
from seed import seed
from services import flight, user, booking
from schemas import FlightOut, BookingOut, UserOut, ErrorResponse, BookingRequest, UserRegistration, UpgradeRequest

# Load environment variables from .env file
load_dotenv()


# ==================== MCP SERVER (for AI agents) ====================
# NOTE: MCP server must be created before FastAPI app to properly combine lifespans

mcp = FastMCP("Galaxium Booking System")


@mcp.tool()
def list_flights() -> list[FlightOut]:
    """List all available flights.
    Returns a list of flights with origin, destination, times, price, and seats available."""
    db = SessionLocal()
    try:
        return flight.list_flights(db)
    finally:
        db.close()


@mcp.tool()
def book_flight(user_id: int, name: str, flight_id: int, seat_class: str = "economy") -> BookingOut:
    """Book a seat on a specific flight for a user in the specified seat class.
    Requires user_id, name, and flight_id.
    Optional seat_class: 'economy' (default), 'business', or 'galaxium'.
    Decrements available seats for the selected class if successful.
    Returns booking details or raises an error if booking is not possible."""
    db = SessionLocal()
    try:
        result = booking.book_flight(db, user_id, name, flight_id, seat_class)
        if isinstance(result, ErrorResponse):
            raise Exception(result.details or result.error)
        return result
    finally:
        db.close()


@mcp.tool()
def get_bookings(user_id: int) -> list[BookingOut]:
    """Retrieve all bookings for a specific user by user_id.
    Returns a list of booking details for the user."""
    db = SessionLocal()
    try:
        return booking.get_bookings(db, user_id)
    finally:
        db.close()


@mcp.tool()
def cancel_booking(booking_id: int) -> BookingOut:
    """Cancel an existing booking by its booking_id.
    Increments available seats for the flight if successful.
    Returns updated booking details or raises an error if already cancelled or not found."""
    db = SessionLocal()
    try:
        result = booking.cancel_booking(db, booking_id)
        if isinstance(result, ErrorResponse):
            raise Exception(result.details or result.error)
        return result
    finally:
        db.close()


@mcp.tool()
def register_user(name: str, email: str) -> UserOut:
    """Register a new user with a name and unique email.
    Returns the created user's details or raises an error if the email is already registered."""
    db = SessionLocal()
    try:
        result = user.register_user(db, name, email)
        if isinstance(result, ErrorResponse):
            raise Exception(result.details or result.error)
        return result
    finally:
        db.close()


@mcp.tool()
def get_user_id(name: str, email: str) -> UserOut:
    """Retrieve a user's information, including user_id, by providing both name and email.
    Returns user details or raises an error if not found."""
    db = SessionLocal()
    try:
        result = user.get_user(db, name, email)
        if isinstance(result, ErrorResponse):
            raise Exception(result.details or result.error)
        return result
    finally:
        db.close()


# Create the MCP HTTP app for mounting
mcp_app = mcp.http_app()


# ==================== LIFESPAN ====================

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()

    should_seed = os.getenv("SEED_DEMO_DATA", "true").lower() in {"1", "true", "yes", "on"}
    if should_seed:
        seed()

    yield
    # Shutdown (nothing to do)


# ==================== FASTAPI APP (REST + Swagger UI) ====================

app = FastAPI(
    title="Galaxium Booking System",
    description="API for booking interplanetary flights. Swagger UI available at /docs",
    version="1.0.0",
    lifespan=lifespan,
    root_path="/api"  # Add this for ALB routing
)

# Get allowed origins from environment
allowed_origins = os.getenv("CORS_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["Health"])
def health_check():
    """Health check endpoint."""
    return {"status": "OK"}


@app.get("/flights", response_model=list[FlightOut], tags=["Flights"])
def get_flights(
    # Basic filters from main branch
    origin: Optional[str] = None,
    destination: Optional[str] = None,
    departure_date_from: Optional[str] = None,
    departure_date_to: Optional[str] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    has_economy: Optional[bool] = None,
    has_business: Optional[bool] = None,
    has_galaxium: Optional[bool] = None,
    sort: Optional[str] = None,
    order: Optional[str] = 'asc',
    # Phase 1: Core Filters from feature branch
    sort_by: Optional[str] = None,
    sort_order: Optional[str] = None,
    seat_class: Optional[str] = None,
    # Phase 2: Additional Filters from feature branch
    departure_time_period: Optional[str] = None,
    min_duration: Optional[int] = None,
    max_duration: Optional[int] = None,
    min_seats_available: Optional[int] = None,
    # Phase 3: Popular Routes from feature branch
    route_category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all available flights with optional filtering and sorting.
    
    All query parameters are optional for backward compatibility.
    
    **Basic Filters:**
    - origin: Filter by origin (case-insensitive partial match)
    - destination: Filter by destination (case-insensitive partial match)
    - departure_date_from: Filter flights departing on or after this date (ISO format)
    - departure_date_to: Filter flights departing on or before this date (ISO format)
    - min_price: Minimum price (checks economy price)
    - max_price: Maximum price (checks economy price)
    - has_economy: Only flights with economy seats available
    - has_business: Only flights with business seats available
    - has_galaxium: Only flights with galaxium seats available
    - sort: Sort by 'price', 'departure_time', or 'duration'
    - order: Sort order 'asc' or 'desc' (default: asc)
    
    **Phase 1 - Core Filters:**
    - sort_by: Field to sort by (departure_time, base_price, duration, seats_available)
    - sort_order: Sort direction (asc, desc)
    - seat_class: Filter by seat class availability (economy, business, galaxium)
    
    **Phase 2 - Additional Filters:**
    - departure_time_period: Time of day (morning, afternoon, evening, night)
    - min_duration: Minimum flight duration in hours
    - max_duration: Maximum flight duration in hours
    - min_seats_available: Minimum total seats available
    
    **Phase 3 - Popular Routes:**
    - route_category: Route category (inner_planets, outer_planets, moons)
    """
    return flight.list_flights(
        db=db,
        origin=origin,
        destination=destination,
        departure_date_from=departure_date_from,
        departure_date_to=departure_date_to,
        min_price=min_price,
        max_price=max_price,
        has_economy=has_economy,
        has_business=has_business,
        has_galaxium=has_galaxium,
        sort=sort,
        order=order,
        sort_by=sort_by,
        sort_order=sort_order,
        seat_class=seat_class,
        departure_time_period=departure_time_period,
        min_duration=min_duration,
        max_duration=max_duration,
        min_seats_available=min_seats_available,
        route_category=route_category
    )


@app.post("/book", response_model=Union[BookingOut, ErrorResponse], tags=["Bookings"])
def book_flight_endpoint(request: BookingRequest, db: Session = Depends(get_db)):
    """Book a seat on a specific flight for a user in the specified seat class.

    Requires user_id, name, and flight_id.
    Optional seat_class: 'economy' (default), 'business', or 'galaxium'.
    Decrements available seats for the selected class if successful.
    """
    return booking.book_flight(
        db,
        request.user_id,
        request.name,
        request.flight_id,
        request.seat_class,
        request.adult_count,
        request.lap_infant_count,
        request.seated_infant_count
    )


@app.get("/bookings/{user_id}", response_model=list[BookingOut], tags=["Bookings"])
def get_user_bookings(user_id: int, db: Session = Depends(get_db)):
    """Retrieve all bookings for a specific user by user_id."""
    return booking.get_bookings(db, user_id)


@app.post("/cancel/{booking_id}", response_model=Union[BookingOut, ErrorResponse], tags=["Bookings"])
def cancel_booking_endpoint(booking_id: int, db: Session = Depends(get_db)):
    """Cancel an existing booking by its booking_id.

    Increments available seats for the flight if successful.
    """
    return booking.cancel_booking(db, booking_id)


@app.post("/upgrade/{booking_id}", response_model=Union[BookingOut, ErrorResponse], tags=["Bookings"])
def upgrade_booking_endpoint(booking_id: int, request: UpgradeRequest, db: Session = Depends(get_db)):
    """Upgrade an existing booking to a higher seat class.

    Changes the seat class and adjusts the price. Restores the old seat and takes the new seat.
    Only allows upgrades (economy -> business/galaxium, business -> galaxium).
    """
    return booking.upgrade_booking(db, booking_id, request.new_seat_class)


@app.post("/register", response_model=Union[UserOut, ErrorResponse], tags=["Users"])
def register_user_endpoint(request: UserRegistration, db: Session = Depends(get_db)):
    """Register a new user with a name and unique email."""
    return user.register_user(db, request.name, request.email)


@app.get("/user", response_model=Union[UserOut, ErrorResponse], tags=["Users"])
def get_user_endpoint(name: str, email: str, db: Session = Depends(get_db)):
    """Get user by name and email."""
    return user.get_user(db, name, email)


@app.put("/users/{user_id}", response_model=Union[UserOut, ErrorResponse], tags=["Users"])
def update_user_endpoint(user_id: int, request: UserRegistration, db: Session = Depends(get_db)):
    """Update an existing user."""
    return user.update_user(db, user_id, request.name, request.email)


# ==================== JAVA SERVICE INTEGRATION ====================

JAVA_SERVICE_URL = os.getenv("JAVA_SERVICE_URL", "http://localhost:8080")


@app.post("/internal/bookings/from-hold", response_model=BookingOut, tags=["Internal"])
def create_booking_from_hold(hold_data: dict, db: Session = Depends(get_db)):
    """Internal endpoint for Java hold service to create bookings.

    This endpoint is called by the Java inventory hold service when confirming a hold.
    Returns HTTP 400 on booking failure so the Java service can detect and propagate the error.
    """
    result = booking.book_flight(
        db,
        user_id=hold_data["travelerId"],
        name=hold_data["travelerName"],
        flight_id=hold_data["flightId"],
        seat_class=hold_data["seatClass"],
        adult_count=hold_data.get("adultCount", 1),
        lap_infant_count=hold_data.get("lapInfantCount", 0),
        seated_infant_count=hold_data.get("seatedInfantCount", 0)
    )
    if isinstance(result, ErrorResponse):
        raise HTTPException(status_code=400, detail=result.model_dump())
    return result


# ==================== MOCK INVENTORY SERVICE (replaces Java service) ====================

import uuid
from datetime import datetime, timedelta

# In-memory storage for quotes and holds
mock_quotes = {}
mock_holds = {}

@app.post("/quotes", tags=["Quotes"])
def create_quote(quote_data: dict, db: Session = Depends(get_db)):
    """Create a quote for a flight booking."""
    # Validate flight exists and get pricing
    flights = flight.list_flights(db)
    target_flight = next((f for f in flights if f.flight_id == quote_data["flightId"]), None)
    
    if not target_flight:
        return {"error": "Flight not found"}
    
    # Get passenger mix and seat-class pricing
    seat_class = quote_data["seatClass"].lower()
    adult_count = quote_data.get("adultCount", 1)
    lap_infant_count = quote_data.get("lapInfantCount", 0)
    seated_infant_count = quote_data.get("seatedInfantCount", 0)

    if adult_count < 1:
        return {"error": "At least one adult is required"}

    if lap_infant_count < 0 or seated_infant_count < 0:
        return {"error": "Infant counts cannot be negative"}

    if seat_class == "economy":
        price_per_seat = target_flight.economy_price
        seats_available = target_flight.economy_seats_available
    elif seat_class == "business":
        price_per_seat = target_flight.business_price
        seats_available = target_flight.business_seats_available
    elif seat_class == "galaxium":
        price_per_seat = target_flight.galaxium_price
        seats_available = target_flight.galaxium_seats_available
    else:
        return {"error": "Invalid seat class"}

    quantity = adult_count + seated_infant_count
    if seats_available < quantity:
        return {"error": f"Not enough seats available. Only {seats_available} seats left in {seat_class} class"}

    total_infants = lap_infant_count + seated_infant_count
    special_infants = 1 if total_infants > 0 else 0
    discounted_seated_infants = min(seated_infant_count, special_infants)
    remaining_special_infants = special_infants - discounted_seated_infants
    free_lap_infants = min(lap_infant_count, remaining_special_infants)
    full_fare_seated_infants = seated_infant_count - discounted_seated_infants
    full_fare_lap_infants = lap_infant_count - free_lap_infants

    adultSubtotal = price_per_seat * adult_count
    seatedInfantSubtotal = int(price_per_seat * 0.5) * discounted_seated_infants
    seatedInfantSubtotal += price_per_seat * full_fare_seated_infants
    lapInfantSubtotal = price_per_seat * full_fare_lap_infants
    totalPrice = adultSubtotal + seatedInfantSubtotal + lapInfantSubtotal

    # Create quote
    quote_id = str(uuid.uuid4())
    now = datetime.utcnow()
    expires_at = now + timedelta(minutes=15)
    
    quote = {
        "quoteId": quote_id,
        "flightId": quote_data["flightId"],
        "seatClass": quote_data["seatClass"],
        "quantity": quantity,
        "adultCount": adult_count,
        "lapInfantCount": lap_infant_count,
        "seatedInfantCount": seated_infant_count,
        "travelerId": quote_data["travelerId"],
        "travelerName": quote_data["travelerName"],
        "pricePerSeat": price_per_seat,
        "adultSubtotal": adultSubtotal,
        "lapInfantSubtotal": lapInfantSubtotal,
        "seatedInfantSubtotal": seatedInfantSubtotal,
        "totalPrice": totalPrice,
        "expiresAt": expires_at.isoformat() + "Z",
        "status": "CREATED",
        "createdAt": now.isoformat() + "Z"
    }
    
    mock_quotes[quote_id] = quote
    return quote


@app.get("/quotes/{quote_id}", tags=["Quotes"])
def get_quote(quote_id: str):
    """Get a quote by ID."""
    quote = mock_quotes.get(quote_id)
    if not quote:
        return {"error": "Quote not found"}
    
    # Check if expired
    expires_at = datetime.fromisoformat(quote["expiresAt"].replace("Z", ""))
    if datetime.utcnow() > expires_at:
        quote["status"] = "EXPIRED"
    
    return quote


@app.post("/quotes/{quote_id}/holds", tags=["Holds"])
def create_hold(quote_id: str):
    """Create a hold from a quote."""
    quote = mock_quotes.get(quote_id)
    if not quote:
        return {"error": "Quote not found"}
    
    # Check if quote is expired
    expires_at = datetime.fromisoformat(quote["expiresAt"].replace("Z", ""))
    if datetime.utcnow() > expires_at:
        return {"error": "Quote has expired"}
    
    # Create hold
    hold_id = str(uuid.uuid4())
    now = datetime.utcnow()
    reserved_until = now + timedelta(minutes=10)
    
    hold = {
        "holdId": hold_id,
        "quoteId": quote_id,
        "status": "HELD",
        "reservedUntil": reserved_until.isoformat() + "Z",
        "createdAt": now.isoformat() + "Z",
        "updatedAt": now.isoformat() + "Z"
    }
    
    mock_holds[hold_id] = hold
    return hold


@app.get("/holds/{hold_id}", tags=["Holds"])
def get_hold(hold_id: str):
    """Get a hold by ID."""
    hold = mock_holds.get(hold_id)
    if not hold:
        return {"error": "Hold not found"}
    
    # Check if expired
    reserved_until = datetime.fromisoformat(hold["reservedUntil"].replace("Z", ""))
    if datetime.utcnow() > reserved_until and hold["status"] == "HELD":
        hold["status"] = "EXPIRED"
        hold["updatedAt"] = datetime.utcnow().isoformat() + "Z"
    
    return hold


@app.post("/holds/{hold_id}/confirm", tags=["Holds"])
def confirm_hold(hold_id: str, db: Session = Depends(get_db)):
    """Confirm a hold and create a booking."""
    hold = mock_holds.get(hold_id)
    if not hold:
        return {"error": "Hold not found"}
    
    if hold["status"] != "HELD":
        return {"error": f"Hold cannot be confirmed. Current status: {hold['status']}"}
    
    # Check if expired
    reserved_until = datetime.fromisoformat(hold["reservedUntil"].replace("Z", ""))
    if datetime.utcnow() > reserved_until:
        hold["status"] = "EXPIRED"
        hold["updatedAt"] = datetime.utcnow().isoformat() + "Z"
        return {"error": "Hold has expired"}
    
    # Get quote details
    quote = mock_quotes.get(hold["quoteId"])
    if not quote:
        return {"error": "Quote not found"}
    
    # Create booking
    result = booking.book_flight(
        db,
        user_id=quote["travelerId"],
        name=quote["travelerName"],
        flight_id=quote["flightId"],
        seat_class=quote["seatClass"].lower(),
        adult_count=quote.get("adultCount", 1),
        lap_infant_count=quote.get("lapInfantCount", 0),
        seated_infant_count=quote.get("seatedInfantCount", 0)
    )
    
    if isinstance(result, ErrorResponse):
        hold["status"] = "CONFIRMATION_FAILED"
        hold["errorMessage"] = result.error
        hold["updatedAt"] = datetime.utcnow().isoformat() + "Z"
        return {"error": result.error, "hold": hold}
    
    # Update hold status
    hold["status"] = "CONFIRMED"
    hold["externalBookingReference"] = str(result.booking_id)
    hold["updatedAt"] = datetime.utcnow().isoformat() + "Z"
    
    return hold


@app.post("/holds/{hold_id}/release", tags=["Holds"])
def release_hold(hold_id: str):
    """Release a hold."""
    hold = mock_holds.get(hold_id)
    if not hold:
        return {"error": "Hold not found"}
    
    if hold["status"] not in ["HELD", "EXPIRED"]:
        return {"error": f"Hold cannot be released. Current status: {hold['status']}"}
    
    hold["status"] = "RELEASED"
    hold["updatedAt"] = datetime.utcnow().isoformat() + "Z"
    
    return hold


# ==================== MOUNT MCP INTO FASTAPI ====================

app.mount("/mcp", mcp_app)


# ==================== MAIN ====================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
