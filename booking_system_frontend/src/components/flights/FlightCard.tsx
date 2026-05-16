import type { Flight, SeatClass } from '../../types';
import { Card, Button } from '../common';
import { Plane, Clock, Users, Crown, Rocket, Star, TrendingUp, Sparkles } from 'lucide-react';
import { formatCurrency, formatDate, formatTime, calculateDuration } from '../../utils/formatters';
import { motion } from 'framer-motion';

interface FlightCardProps {
  flight: Flight;
  onBook: (flight: Flight) => void;
}

export const FlightCard = ({ flight, onBook }: FlightCardProps) => {
  const totalSeats = flight.economy_seats_available + flight.business_seats_available + flight.galaxium_seats_available;
  const isSoldOut = totalSeats === 0;

  // Calculate best value (lowest price per seat ratio)
  const economyValue = flight.economy_seats_available > 0 ? flight.economy_price / 1.0 : Infinity;
  const businessValue = flight.business_seats_available > 0 ? flight.business_price / 2.5 : Infinity;
  const galaxiumValue = flight.galaxium_seats_available > 0 ? flight.galaxium_price / 5.0 : Infinity;
  const bestValue = Math.min(economyValue, businessValue, galaxiumValue);

  const seatClasses = [
    {
      name: 'Economy',
      class: 'economy' as SeatClass,
      price: flight.economy_price,
      seats: flight.economy_seats_available,
      icon: Plane,
      color: 'text-[#0f62fe]',
      bgColor: 'bg-[#edf5ff]',
      borderColor: 'border-[#a6c8ff]',
      badge: economyValue === bestValue && flight.economy_seats_available > 0 ? 'Best Value' : null,
      badgeColor: 'bg-[#0f62fe]',
      badgeIcon: TrendingUp,
    },
    {
      name: 'Business',
      class: 'business' as SeatClass,
      price: flight.business_price,
      seats: flight.business_seats_available,
      icon: Crown,
      color: 'text-[#6929c4]',
      bgColor: 'bg-[#f6f2ff]',
      borderColor: 'border-[#d4bbff]',
      badge: 'Most Popular',
      badgeColor: 'bg-[#6929c4]',
      badgeIcon: Star,
    },
    {
      name: 'Galaxium Class',
      class: 'galaxium' as SeatClass,
      price: flight.galaxium_price,
      seats: flight.galaxium_seats_available,
      icon: Rocket,
      color: 'text-[#198038]',
      bgColor: 'bg-[#defbe6]',
      borderColor: 'border-[#a7f0ba]',
      badge: 'Premium',
      badgeColor: 'bg-[#198038]',
      badgeIcon: Sparkles,
      isPremium: true,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="h-full flex flex-col">
        {/* Route Header */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#e0e0e0] dark-theme-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#edf5ff] border border-[#a6c8ff] dark-theme-blue-surface">
              <Plane className="text-[#0f62fe] dark-theme-blue-text" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#161616] dark-theme-text">
                {flight.origin} → {flight.destination}
              </h3>
              <p className="text-sm text-[#525252] dark-theme-subtle">
                Flight #{flight.flight_id}
              </p>
            </div>
          </div>
        </div>

        {/* Flight Details */}
        <div className="space-y-4 mb-6 flex-1">
          {/* Departure & Arrival */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-[#525252] dark-theme-subtle mb-1">Departure</p>
              <p className="text-sm font-medium text-[#161616] dark-theme-text">
                {formatDate(flight.departure_time, 'MMM dd, yyyy')}
              </p>
              <p className="text-lg font-bold text-[#0f62fe]">
                {formatTime(flight.departure_time)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#525252] dark-theme-subtle mb-1">Arrival</p>
              <p className="text-sm font-medium text-[#161616] dark-theme-text">
                {formatDate(flight.arrival_time, 'MMM dd, yyyy')}
              </p>
              <p className="text-lg font-bold text-[#0f62fe]">
                {formatTime(flight.arrival_time)}
              </p>
            </div>
          </div>

          {/* Duration */}
          <div className="flex items-center gap-2 text-[#525252] dark-theme-subtle">
            <Clock size={16} />
            <span className="text-sm">
              Duration: {calculateDuration(flight.departure_time, flight.arrival_time)}
            </span>
          </div>

          {/* Seat Classes */}
          <div className="space-y-3">
            <p className="text-xs text-[#525252] dark-theme-subtle mb-2">Available Seat Classes</p>
            {seatClasses.map((seatClass) => {
              const Icon = seatClass.icon;
              const BadgeIcon = seatClass.badgeIcon;
              const isClassSoldOut = seatClass.seats === 0;
              const isLowSeats = seatClass.seats <= 2 && seatClass.seats > 0;
              
              return (
                <motion.div
                  key={seatClass.class}
                  whileHover={{ scale: isClassSoldOut ? 1 : 1.02 }}
                  transition={{ duration: 0.2 }}
                  className="relative"
                >
                  {/* Premium Galaxium animated border */}
                  {seatClass.isPremium && !isClassSoldOut && (
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-[#a7f0ba] via-[#defbe6] to-[#a7f0ba] dark-theme-green-surface opacity-50 blur-sm" />
                  )}
                  
                  <div
                    className={`relative p-3 rounded-lg border ${seatClass.borderColor} ${seatClass.bgColor} ${
                      isClassSoldOut ? 'opacity-50' : ''
                    } ${seatClass.isPremium && !isClassSoldOut ? 'animate-pulse-glow' : ''} transition-all`}
                  >
                    {/* Badge */}
                    {seatClass.badge && !isClassSoldOut && (
                      <div className={`absolute -top-2 -right-2 ${seatClass.badgeColor} text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-sm`}>
                        {BadgeIcon && <BadgeIcon size={10} />}
                        {seatClass.badge}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded ${seatClass.bgColor}`}>
                          <Icon size={18} className={seatClass.color} />
                        </div>
                        <span className="font-medium text-[#161616] dark-theme-text">{seatClass.name}</span>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${seatClass.color}`}>
                          {formatCurrency(seatClass.price)}
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <Users size={12} className={isLowSeats ? 'text-[#da1e28]' : 'text-[#525252] dark-theme-subtle'} />
                          <span className={isLowSeats ? 'text-[#da1e28] font-semibold' : 'text-[#525252] dark-theme-subtle'}>
                            {isClassSoldOut ? 'Sold Out' : `${seatClass.seats} left`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Book Button */}
        <Button
          onClick={() => onBook(flight)}
          disabled={isSoldOut}
          className="w-full"
        >
          {isSoldOut ? 'All Classes Sold Out' : 'Select Seat Class'}
        </Button>
      </Card>
    </motion.div>
  );
};

// Made with Bob
