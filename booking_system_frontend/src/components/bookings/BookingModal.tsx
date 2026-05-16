import { useState, useEffect } from 'react';
import type { Flight, SeatClass, Quote, Hold } from '../../types';
import { Modal, Button } from '../common';
import {
  Plane,
  DollarSign,
  Crown,
  Rocket,
  Check,
  ArrowLeft,
  Tag,
  Timer,
  Zap,
} from 'lucide-react';
import { formatCurrency, formatDate, calculateDuration } from '../../utils/formatters';
import { createQuote, createHold, confirmHold, releaseHold } from '../../services/api';
import { storeHold, removeHold } from '../../utils/holdStorage';
import { useUser } from '../../hooks/useUser';
import toast from 'react-hot-toast';

type Step = 'select' | 'quote' | 'hold';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  flight: Flight | null;
  onSuccess: () => void;
}

export const BookingModal = ({ isOpen, onClose, flight, onSuccess }: BookingModalProps) => {
  const { user } = useUser();
  const [step, setStep] = useState<Step>('select');
  const [selectedClass, setSelectedClass] = useState<SeatClass>('economy');
  const [lapInfantCount, setLapInfantCount] = useState(0);
  const [seatedInfantCount, setSeatedInfantCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [hold, setHold] = useState<Hold | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setSelectedClass('economy');
      setLapInfantCount(0);
      setSeatedInfantCount(0);
      setQuote(null);
      setHold(null);
      setTimeLeft(0);
    }
  }, [isOpen]);

  // Countdown timer
  useEffect(() => {
    if (!hold || step !== 'hold') return;

    const update = () => {
      const remaining = new Date(hold.reservedUntil).getTime() - Date.now();
      setTimeLeft(isNaN(remaining) ? 0 : Math.max(0, remaining));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [hold, step]);

  if (!flight) return null;

  const seatClasses = [
    {
      name: 'Economy',
      class: 'economy' as SeatClass,
      price: flight.economy_price,
      seats: flight.economy_seats_available,
      icon: Plane,
      color: 'text-[#0f62fe]',
      bgColor: 'bg-[#edf5ff]',
      borderColor: 'border-[#78a9ff]',
      features: ['Standard seating', 'In-flight entertainment', 'Complimentary snacks'],
    },
    {
      name: 'Business',
      class: 'business' as SeatClass,
      price: flight.business_price,
      seats: flight.business_seats_available,
      icon: Crown,
      color: 'text-[#8a3ffc]',
      bgColor: 'bg-[#f6f2ff]',
      borderColor: 'border-[#be95ff]',
      features: ['Premium seating', 'Priority boarding', 'Gourmet meals', 'Extra legroom'],
    },
    {
      name: 'Galaxium Class',
      class: 'galaxium' as SeatClass,
      price: flight.galaxium_price,
      seats: flight.galaxium_seats_available,
      icon: Rocket,
      color: 'text-[#198038]',
      bgColor: 'bg-[#defbe6]',
      borderColor: 'border-[#42be65]',
      features: ['Luxury pods', 'VIP lounge access', 'Personal concierge', 'Zero-G experience'],
    },
  ];

  const selectedClassData = seatClasses.find((sc) => sc.class === selectedClass);

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);
  const timerDisplay = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isExpired = hold !== null && timeLeft === 0;

  const flightSummary = (
    <div className="carbon-card p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-lg bg-[#edf5ff] dark-theme-blue-surface">
          <Plane className="text-[#0f62fe] dark-theme-blue-text" size={20} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#161616] dark-theme-text">
            {flight.origin} → {flight.destination}
          </h3>
          <p className="text-xs text-[#6f6f6f] dark-theme-helper">Flight #{flight.flight_id}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-xs text-[#6f6f6f] dark-theme-helper mb-1">Departure</p>
          <p className="text-[#161616] dark-theme-text font-medium">
            {formatDate(flight.departure_time, 'MMM dd')}
          </p>
        </div>
        <div>
          <p className="text-xs text-[#6f6f6f] dark-theme-helper mb-1">Arrival</p>
          <p className="text-[#161616] dark-theme-text font-medium">
            {formatDate(flight.arrival_time, 'MMM dd')}
          </p>
        </div>
        <div>
          <p className="text-xs text-[#6f6f6f] dark-theme-helper mb-1">Duration</p>
          <p className="text-[#161616] dark-theme-text font-medium">
            {calculateDuration(flight.departure_time, flight.arrival_time)}
          </p>
        </div>
      </div>
    </div>
  );

  const handleGetQuote = async () => {
    if (!user) {
      toast.error('Please sign in to get a quote');
      return;
    }

    setIsLoading(true);
    try {
      const newQuote = await createQuote({
        flightId: flight.flight_id,
        seatClass: selectedClass,
        adultCount: 1,
        lapInfantCount,
        seatedInfantCount,
        travelerId: user.user_id,
        travelerName: user.name,
      });
      setQuote(newQuote);
      setStep('quote');
    } catch {
      toast.error('Failed to get quote. Make sure the inventory service is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlaceHold = async () => {
    if (!quote) return;

    setIsLoading(true);
    try {
      const newHold = await createHold(quote.quoteId);
      setHold(newHold);
      setStep('hold');

      if (user) {
        storeHold(user.user_id, {
          holdId: newHold.holdId,
          quoteId: quote.quoteId,
          flightId: flight.flight_id,
          seatClass: selectedClass,
          adultCount: quote.adultCount,
          lapInfantCount: quote.lapInfantCount,
          seatedInfantCount: quote.seatedInfantCount,
          pricePerSeat: quote.pricePerSeat,
          adultSubtotal: quote.adultSubtotal,
          lapInfantSubtotal: quote.lapInfantSubtotal,
          seatedInfantSubtotal: quote.seatedInfantSubtotal,
          totalPrice: quote.totalPrice,
          reservedUntil: newHold.reservedUntil,
        });
      }

      toast.success('Seat held! You have 15 minutes to confirm.');
    } catch {
      toast.error('Failed to place hold');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmHold = async () => {
    if (!hold || !user) return;

    setIsLoading(true);
    try {
      const confirmed = await confirmHold(hold.holdId);
      removeHold(user.user_id, hold.holdId);
      toast.success(
        `Booking confirmed! Reference: #${confirmed.externalBookingReference}`
      );
      onSuccess();
      onClose();
    } catch {
      toast.error('Failed to confirm booking');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReleaseHold = async () => {
    if (!hold || !user) return;

    setIsLoading(true);
    try {
      await releaseHold(hold.holdId);
      removeHold(user.user_id, hold.holdId);
      toast.success('Hold released');
      onClose();
    } catch {
      toast.error('Failed to release hold');
    } finally {
      setIsLoading(false);
    }
  };

  const getModalTitle = () => {
    switch (step) {
      case 'select':
        return 'Book Your Flight';
      case 'quote':
        return 'Your Price Quote';
      case 'hold':
        return 'Seat Reserved';
    }
  };

  // Step 1: Seat class selection
  const renderSelectStep = () => (
    <div className="space-y-6">
      {flightSummary}

      <div className="space-y-3">
        {seatClasses.map((sc) => {
          const Icon = sc.icon;
          const isSelected = selectedClass === sc.class;
          const isSoldOut = sc.seats === 0;

          return (
            <button
              key={sc.class}
              onClick={() => !isSoldOut && setSelectedClass(sc.class)}
              disabled={isSoldOut}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                isSelected
                  ? `${sc.borderColor} ${sc.bgColor}`
                  : 'border-[#e0e0e0] dark-theme-border bg-white dark:bg-[#393939] hover:border-[#0f62fe]'
              } ${isSoldOut ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon size={20} className={sc.color} />
                  <span className="font-semibold text-[#161616] dark-theme-text">{sc.name}</span>
                  {isSelected && <Check size={18} className={sc.color} />}
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${sc.color}`}>
                    {formatCurrency(sc.price)}
                  </div>
                  <div className="text-xs text-[#6f6f6f] dark-theme-helper">
                    {isSoldOut ? 'Sold Out' : `${sc.seats} left`}
                  </div>
                </div>
              </div>
              <ul className="text-xs text-[#525252] dark-theme-subtle space-y-1">
                {sc.features.map((f, i) => (
                  <li key={i}>• {f}</li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <div className="carbon-card p-4 space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-[#161616] dark-theme-text mb-2">Passengers</h4>
          {user && (
            <>
              <p className="text-[#161616] dark-theme-text">Adult: {user.name}</p>
              <p className="text-[#6f6f6f] dark-theme-helper text-sm">{user.email}</p>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-[#e0e0e0] dark-theme-border bg-[#f4f4f4] dark:bg-[#393939] p-3">
            <p className="text-xs text-[#6f6f6f] dark-theme-helper mb-2">Lap infants</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLapInfantCount((count) => Math.max(0, count - 1))}
                className="h-8 w-8 rounded border border-[#c6c6c6] dark:border-[#6f6f6f] text-[#161616] dark:text-[#f4f4f4] bg-white dark:bg-[#262626]"
                type="button"
              >
                −
              </button>
              <span className="min-w-6 text-center text-[#161616] dark-theme-text font-semibold">
                {lapInfantCount}
              </span>
              <button
                onClick={() => setLapInfantCount((count) => count + 1)}
                className="h-8 w-8 rounded border border-[#c6c6c6] dark:border-[#6f6f6f] text-[#161616] dark:text-[#f4f4f4] bg-white dark:bg-[#262626]"
                type="button"
              >
                +
              </button>
            </div>
            <p className="mt-2 text-xs text-[#6f6f6f] dark-theme-helper">Only one infant gets special pricing.</p>
          </div>

          <div className="rounded-lg border border-[#e0e0e0] dark-theme-border bg-[#f4f4f4] dark:bg-[#393939] p-3">
            <p className="text-xs text-[#6f6f6f] dark-theme-helper mb-2">Seated infants</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSeatedInfantCount((count) => Math.max(0, count - 1))}
                className="h-8 w-8 rounded border border-[#c6c6c6] dark:border-[#6f6f6f] text-[#161616] dark:text-[#f4f4f4] bg-white dark:bg-[#262626]"
                type="button"
              >
                −
              </button>
              <span className="min-w-6 text-center text-[#161616] dark-theme-text font-semibold">
                {seatedInfantCount}
              </span>
              <button
                onClick={() => setSeatedInfantCount((count) => count + 1)}
                className="h-8 w-8 rounded border border-[#c6c6c6] dark:border-[#6f6f6f] text-[#161616] dark:text-[#f4f4f4] bg-white dark:bg-[#262626]"
                type="button"
              >
                +
              </button>
            </div>
            <p className="mt-2 text-xs text-[#6f6f6f] dark-theme-helper">Seated infants use a seat.</p>
          </div>
        </div>

        <div className="rounded-lg border border-[#ffd7c2] dark-theme-orange-surface bg-[#fff1e8] p-3 text-xs text-[#525252] dark-theme-subtle">
          1 adult is included. Lap infants do not use a seat. Seated infants use a seat. Only one infant per booking gets discounted or free pricing.
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onClose} disabled={isLoading} className="flex-1">
          Cancel
        </Button>
        <Button onClick={handleGetQuote} isLoading={isLoading} className="flex-1">
          Get Quote →
        </Button>
      </div>
    </div>
  );

  // Step 2: Quote review
  const renderQuoteStep = () => {
    const Icon = selectedClassData?.icon || Plane;
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 p-3 rounded-lg bg-[#f6f2ff] dark-theme-purple-surface border border-[#be95ff]">
          <Tag size={16} className="text-[#8a3ffc] dark-theme-purple-text" />
          <span className="text-xs text-[#6f6f6f] dark-theme-helper">Quote ID</span>
          <span className="font-mono font-bold text-[#8a3ffc] dark-theme-purple-text ml-auto">{quote?.quoteId}</span>
        </div>

        {flightSummary}

        <div className="carbon-card p-4 space-y-3">
          <h4 className="text-sm font-semibold text-[#161616] dark-theme-text">Price Breakdown</h4>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon size={16} className={selectedClassData?.color} />
              <span className="text-sm text-[#525252] dark-theme-subtle">Adult × {quote?.adultCount || 1}</span>
            </div>
            <span className="text-[#161616] dark-theme-text font-medium">
              {formatCurrency(quote?.adultSubtotal || 0)}
            </span>
          </div>
          {(quote?.seatedInfantCount || 0) > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#525252] dark-theme-subtle">
                Seated infant × {quote?.seatedInfantCount || 0}
              </span>
              <span className="text-[#161616] dark-theme-text font-medium">
                {formatCurrency(quote?.seatedInfantSubtotal || 0)}
              </span>
            </div>
          )}
          {(quote?.lapInfantCount || 0) > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#525252] dark-theme-subtle">
                Lap infant × {quote?.lapInfantCount || 0}
              </span>
              <span className="text-[#161616] dark-theme-text font-medium">
                {formatCurrency(quote?.lapInfantSubtotal || 0)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between text-xs text-[#6f6f6f] dark-theme-helper">
            <span>Seats required</span>
            <span>{quote?.quantity || 1}</span>
          </div>
          <div className="border-t border-[#e0e0e0] dark-theme-border pt-3 flex items-center justify-between">
            <span className="font-semibold text-[#161616] dark-theme-text">Total</span>
            <span className="text-xl font-bold text-[#198038]">
              {formatCurrency(quote?.totalPrice || 0)}
            </span>
          </div>
          <p className="text-xs text-[#6f6f6f] dark-theme-helper">
            Quote valid for 24 hours · Price calculated by inventory service
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => setStep('select')}
            disabled={isLoading}
            className="flex-1"
          >
            <ArrowLeft size={16} /> Back
          </Button>
          <Button onClick={handlePlaceHold} isLoading={isLoading} className="flex-1">
            <Timer size={16} /> Place Hold →
          </Button>
        </div>
      </div>
    );
  };

  // Step 3: Hold active with countdown
  const renderHoldStep = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 p-3 rounded-lg bg-[#defbe6] dark-theme-green-surface border border-[#42be65]">
        <Zap size={16} className="text-[#198038] dark-theme-green-text" />
        <span className="text-xs text-[#6f6f6f] dark-theme-helper">Hold ID</span>
        <span className="font-mono font-bold text-[#198038] dark-theme-green-text ml-auto">{hold?.holdId}</span>
      </div>

      {/* Countdown timer */}
      <div
        className={`p-6 text-center rounded-xl border-2 ${
          isExpired
            ? 'border-red-500/50 bg-red-500/5'
            : 'border-solar-orange/50 bg-solar-orange/5'
        }`}
      >
        <p className="text-xs text-[#6f6f6f] dark-theme-helper mb-2 uppercase tracking-widest">
          {isExpired ? 'Hold Expired' : 'Time to Confirm'}
        </p>
        <div
          className={`text-5xl font-mono font-bold tabular-nums ${
            isExpired ? 'text-red-500' : 'text-solar-orange'
          }`}
        >
          {isExpired ? 'EXPIRED' : timerDisplay}
        </div>
        {!isExpired && (
          <p className="text-xs text-[#6f6f6f] dark-theme-helper mt-2">
            Seat is reserved — confirm before time runs out
          </p>
        )}
      </div>

      {flightSummary}

      <div className="flex items-center justify-between p-4 rounded-xl bg-[#edf5ff] dark-theme-blue-surface border border-[#78a9ff]">
        <div className="flex items-center gap-2">
          <DollarSign className="text-[#0f62fe] dark-theme-blue-text" size={20} />
          <span className="text-[#161616] dark-theme-text font-semibold">Total</span>
        </div>
        <span className="text-xl font-bold text-[#161616] dark-theme-text">
          {formatCurrency(quote?.totalPrice || 0)}
        </span>
      </div>

      {isExpired ? (
        <Button variant="secondary" onClick={onClose} className="w-full">
          Close
        </Button>
      ) : (
        <>
          <div className="flex gap-3">
            <Button
              variant="danger"
              onClick={handleReleaseHold}
              isLoading={isLoading}
              className="flex-1"
            >
              Release Hold
            </Button>
            <Button onClick={handleConfirmHold} isLoading={isLoading} className="flex-1">
              Confirm Booking
            </Button>
          </div>
          <p className="text-xs text-[#6f6f6f] dark-theme-helper text-center">
            Closing keeps your hold active — find it in My Bookings
          </p>
        </>
      )}
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getModalTitle()} size="md">
      {step === 'select' && renderSelectStep()}
      {step === 'quote' && renderQuoteStep()}
      {step === 'hold' && renderHoldStep()}
    </Modal>
  );
};

// Made with Bob
