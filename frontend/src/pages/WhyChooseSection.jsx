import React from "react";
import { motion } from "framer-motion";
import { FaRocket, FaUsers, FaShieldAlt, FaStar } from "react-icons/fa";

const reasons = [
  {
    id: 1,
    icon: <FaRocket />,
    title: "Streamlined Planning",
    text: "Save valuable time with our efficient, all-in-one event management tools.",
  },
  {
    id: 2,
    icon: <FaUsers />,
    title: "Collaborative Network",
    text: "Connect effortlessly with trusted planners, vendors, and clients.",
  },
  {
    id: 3,
    icon: <FaShieldAlt />,
    title: "Trusted Professionals",
    text: "Work only with verified, top-tier experts in every event category.",
  },
  {
    id: 4,
    icon: <FaStar />,
    title: "Proven Results",
    text: "Delivering hundreds of successful, stress-free events across multiple cities.",
  },
];

const stats = [
  { number: "500+", label: "Events Planned" },
  { number: "98%", label: "Client Satisfaction" },
  { number: "200+", label: "Expert Planners" },
  { number: "50+", label: "Cities Covered" },
];

export default function WhyChooseSection() {
  return (
    <section className="py-16 mt-16 bg-gradient-to-br from-white to-gray-50">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl lg:text-4xl font-bold text-brand-navy">
            Why Choose <span className="text-brand-gold">ElitePlan</span>?
          </h2>
          <p className="text-gray-600 mt-4 max-w-2xl mx-auto">
            Empowering event professionals with smart tools, trusted connections, and
            a platform built for excellence.
          </p>
        </motion.div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {reasons.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.6 }}
              viewport={{ once: true }}
              className="p-6 bg-white shadow-sm rounded-2xl border border-gray-100 hover:shadow-md transition-all duration-300"
            >
              <div className="text-brand-gold text-2xl mb-4">{item.icon}</div>
              <h3 className="font-semibold text-brand-navy mb-2">{item.title}</h3>
              <p className="text-sm text-gray-600">{item.text}</p>
            </motion.div>
          ))}
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-16 text-center"
        >
          {stats.map((stat, index) => (
            <div key={index}>
              <div className="text-2xl font-bold text-brand-navy">{stat.number}</div>
              <div className="text-sm text-gray-600 mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
