import { Link } from 'react-router-dom';
import { Button } from '../components/common';
import { Rocket, Globe, Shield, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export const Home = () => {
  const features = [
    {
      icon: <Rocket size={32} />,
      title: 'Interplanetary Travel',
      description: 'Explore destinations across the solar system with our state-of-the-art spacecraft.',
    },
    {
      icon: <Globe size={32} />,
      title: 'Multiple Destinations',
      description: 'From Mars to Europa, discover new worlds and book your journey today.',
    },
    {
      icon: <Shield size={32} />,
      title: 'Safe & Secure',
      description: 'Your safety is our priority with advanced navigation and life support systems.',
    },
    {
      icon: <Zap size={32} />,
      title: 'Instant Booking',
      description: 'Book your flight in seconds and receive instant confirmation.',
    },
  ];

  return (
    <div className="space-y-20">
      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center py-20"
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="text-[#0f62fe] dark-theme-blue-text">
              Journey Beyond
            </span>
            <br />
            <span className="text-[#161616] dark-theme-text">The Stars</span>
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-xl text-[#525252] dark-theme-subtle mb-8 max-w-2xl mx-auto"
        >
          Experience the future of space travel with Galaxium. Book your
          interplanetary flight and explore the wonders of our solar system.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link to="/flights">
            <Button size="lg" className="w-full sm:w-auto">
              Explore Flights
            </Button>
          </Link>
          <Button variant="secondary" size="lg" className="w-full sm:w-auto">
            Learn More
          </Button>
        </motion.div>
      </motion.section>

      {/* Features Section */}
      <section>
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-3xl md:text-4xl font-bold text-center mb-12 text-[#161616] dark-theme-text"
        >
          Why Choose Galaxium?
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="carbon-card p-6 text-center transition-all duration-300"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#edf5ff] border border-[#a6c8ff] dark-theme-blue-surface mb-4">
                <div className="text-[#0f62fe] dark-theme-blue-text">{feature.icon}</div>
              </div>
              <h3 className="text-xl font-semibold text-[#161616] dark-theme-text mb-2">
                {feature.title}
              </h3>
              <p className="text-[#525252] dark-theme-subtle">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="carbon-card p-12 text-center"
      >
        <h2 className="text-3xl md:text-4xl font-bold text-[#161616] dark-theme-text mb-4">
          Ready for Your Space Adventure?
        </h2>
        <p className="text-[#525252] dark-theme-subtle text-lg mb-8 max-w-2xl mx-auto">
          Join thousands of space travelers who have already booked their
          journey to the stars. Your adventure awaits!
        </p>
        <Link to="/flights">
          <Button variant="secondary" size="lg">
            Book Your Flight Now
          </Button>
        </Link>
      </motion.section>
    </div>
  );
};

// Made with Bob
