import type { Booking, Flight, SeatClass } from '../../types';
import { Card, Button, Modal, Input } from '../common';
import { Plane, Calendar, CheckCircle, XCircle, Clock, Crown, Rocket, Settings } from 'lucide-react';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { motion } from 'framer-motion';
import { modifyBooking, isErrorResponse } from '../../services/api';
import toast from 'react-hot-toast';
import { useMemo, useState } from 'react';

interface BookingCardProps {
  booking: Booking;
  flight?: Flight;
  onCancel: (bookingId: number) => void;
  isCancelling?: boolean;
  onUpgrade?: () => void;
}

/** Render booking details and booking actions. */
export const BookingCard = ({ booking, flight, onCancel, isCancelling, onUpgrade }: BookingCardProps) => {
  const [isSubmittingChange, setIsSubmittingChange] = useState(false);
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [seatClass, setSeatClass] = useState<SeatClass>(booking.seat_class);
  const [adultCount, setAdultCount] = useState(String(booking.adult_count));
  const [lapInfantCount, setLapInfantCount] = useState(String(booking.lap_infant_count));
  const [seatedInfantCount, setSeatedInfantCount] = useState(String(booking.seated_infant_count));

  const availableSeatClasses = useMemo(() => {
    if (!flight) {
      return [
        { value: 'economy' as SeatClass, label: 'Economy' },
        { value: 'business' as SeatClass, label: 'Business' },
        { value: 'galaxium' as SeatClass, label: 'Galaxium Class' },
      ];
    }

    return [
      { value: 'economy' as SeatClass, label: 'Economy', available: flight.economy_seats_available },
      { value: 'business' as SeatClass, label: 'Business', available: flight.business_seats_available },
      { value: 'galaxium' as SeatClass, label: 'Galaxium Class', available: flight.galaxium_seats_available },
    ];
  }, [flight]);

  const resetModifyForm = () => {
    setSeatClass(booking.seat_class);
    setAdultCount(String(booking.adult_count));
    setLapInfantCount(String(booking.lap_infant_count));
    setSeatedInfantCount(String(booking.seated_infant_count));
  };

  const openModifyModal = () => {
    resetModifyForm();
    setShowModifyModal(true);
  };

  const getSeatClassIcon = () => {
    switch (booking.seat_class) {
      case 'business':
        return <Crown className="text-[#8a3ffc]" size={16} />;
      case 'galaxium':
        return <Rocket className="text-[#198038]" size={16} />;
      default:
        return <Plane className="text-[#0f62fe]" size={16} />;
    }
  };

  const getSeatClassName = () => {
    switch (booking.seat_class) {
      case 'business':
        return 'Business';
      case 'galaxium':
        return 'Galaxium Class';
      default:
        return 'Economy';
    }
  };

  const getSeatClassColor = () => {
    switch (booking.seat_class) {
      case 'business':
        return 'text-[#8a3ffc]';
      case 'galaxium':
        return 'text-[#198038]';
      default:
        return 'text-[#0f62fe]';
    }
  };

  const getStatusIcon = () => {
    switch (booking.status) {
      case 'booked':
        return <CheckCircle className="text-[#198038]" size={20} />;
      case 'cancelled':
        return <XCircle className="text-[#da1e28]" size={20} />;
      case 'completed':
        return <CheckCircle className="text-[#0f62fe]" size={20} />;
      default:
        return <Clock className="text-[#6f6f6f]" size={20} />;
    }
  };

  const getStatusColor = () => {
    switch (booking.status) {
      case 'booked':
        return 'text-[#198038]';
      case 'cancelled':
        return 'text-[#da1e28]';
      case 'completed':
        return 'text-[#0f62fe]';
      default:
        return 'text-[#6f6f6f]';
    }
  };

  const handleModifyBooking = async () => {
    setIsSubmittingChange(true);

    try {
      const result = await modifyBooking(booking.booking_id, {
        seat_class: seatClass,
        adult_count: Number(adultCount),
        lap_infant_count: Number(lapInfantCount),
        seated_infant_count: Number(seatedInfantCount),
      });

      if (isErrorResponse(result)) {
        toast.error(result.details || result.error);
        return;
      }

      toast.success('Booking updated successfully');
      setShowModifyModal(false);
      if (onUpgrade) {
        onUpgrade();
      }
    } catch (error: any) {
      toast.error(error.details || error.error || 'Failed to modify booking');
    } finally {
      setIsSubmittingChange(false);
    }
  };

  const canModify = booking.status === 'booked';
  const canCancel = booking.status === 'booked';

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
      >
      <Card>
        <div className="flex flex-col">
          <div className="flex items-start justify-between mb-4 pb-4 border-b border-[#e0e0e0] dark-theme-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#edf5ff] dark-theme-blue-surface">
                <Plane className="text-[#0f62fe] dark-theme-blue-text" size={20} />
              </div>
              <div>
                <p className="text-sm text-[#6f6f6f] dark-theme-helper">Booking #{booking.booking_id}</p>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusIcon()}
                  <span className={`text-sm font-semibold capitalize ${getStatusColor()}`}>
                    {booking.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {flight ? (
          <div className="space-y-3 mb-4">
            <div>
              <h3 className="text-xl font-bold text-[#161616] dark-theme-text mb-1">
                {flight.origin} → {flight.destination}
              </h3>
              <p className="text-sm text-[#6f6f6f] dark-theme-helper">Flight #{flight.flight_id}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[#6f6f6f] dark-theme-helper mb-1">Departure</p>
                <p className="text-sm text-[#161616] dark-theme-text font-medium">
                  {formatDate(flight.departure_time)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#6f6f6f] dark-theme-helper mb-1">Arrival</p>
                <p className="text-sm text-[#161616] dark-theme-text font-medium">
                  {formatDate(flight.arrival_time)}
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-[#e0e0e0] dark-theme-border">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#6f6f6f] dark-theme-helper">Seat Class</span>
                <div className="flex items-center gap-2">
                  {getSeatClassIcon()}
                  <span className={`text-sm font-semibold ${getSeatClassColor()}`}>
                    {getSeatClassName()}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-[#6f6f6f] dark-theme-helper">Passengers</span>
                <span className="text-sm text-[#161616] dark-theme-text text-right">
                  {booking.adult_count} adult
                  {booking.lap_infant_count > 0 ? ` · ${booking.lap_infant_count} lap infant` : ''}
                  {booking.seated_infant_count > 0 ? ` · ${booking.seated_infant_count} seated infant` : ''}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#6f6f6f] dark-theme-helper">Price Paid</span>
                <span className="text-lg font-bold text-[#161616] dark-theme-text">
                  {formatCurrency(booking.price_paid)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <p className="text-sm text-[#6f6f6f] dark-theme-helper">Flight ID: {booking.flight_id}</p>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-[#6f6f6f] dark-theme-helper mb-4">
          <Calendar size={16} />
          <span>Booked on {formatDate(booking.booking_time)}</span>
        </div>

        <div className="space-y-2">
          {canModify && (
            <Button
              variant="secondary"
              size="sm"
              onClick={openModifyModal}
              disabled={isSubmittingChange || isCancelling}
              className="w-full"
            >
              <Settings size={16} />
              Modify Booking
            </Button>
          )}

          {canCancel && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => onCancel(booking.booking_id)}
              isLoading={isCancelling}
              disabled={isSubmittingChange}
              className="w-full"
            >
              Cancel Booking
            </Button>
          )}
        </div>
      </Card>
    </motion.div>

      <Modal
        isOpen={showModifyModal}
        onClose={() => setShowModifyModal(false)}
        title="Modify Booking"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-[#525252] dark-theme-subtle mb-2">Seat class</label>
            <select
              value={seatClass}
              onChange={(event) => setSeatClass(event.target.value as SeatClass)}
              className="carbon-input w-full"
            >
              {availableSeatClasses.map((option) => (
                <option key={option.value} value={option.value} className="text-black">
                  {'available' in option && flight
                    ? `${option.label} (${option.available} seats visible)`
                    : option.label}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Adults"
            type="number"
            min={1}
            value={adultCount}
            onChange={(event) => setAdultCount(event.target.value)}
          />

          <Input
            label="Lap infants"
            type="number"
            min={0}
            value={lapInfantCount}
            onChange={(event) => setLapInfantCount(event.target.value)}
          />

          <Input
            label="Seated infants"
            type="number"
            min={0}
            value={seatedInfantCount}
            onChange={(event) => setSeatedInfantCount(event.target.value)}
          />

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setShowModifyModal(false)}
              disabled={isSubmittingChange}
              className="flex-1"
            >
              Close
            </Button>
            <Button
              variant="primary"
              onClick={handleModifyBooking}
              isLoading={isSubmittingChange}
              className="flex-1"
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

// Made with Bob
