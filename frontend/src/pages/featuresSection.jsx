// src/components/Homepage/FeaturesSection.jsx
import React, { useState, useRef } from "react";
import {
  MdHandshake,
  MdDashboard,
  MdPayment,
  MdAccessTime,
  MdArrowForward,
  MdCheckCircle,
} from "react-icons/md";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import sqz from "../../src/assets/squeeze.png"


const keyfeatures = [
  {
    id: 1,
    icon: <MdHandshake className="text-2xl" />,
    title: "Vendor Matching",
    desc: "Connect with trusted vendors that align perfectly with your event’s needs and style.",
  },
  {
    id: 2,
    icon: <MdDashboard className="text-2xl" />,
    title: "Collaborative Dashboard",
    desc: "Stay organized with shared dashboards that keep planners, vendors, and clients aligned.",
  },
  {
    id: 3,
    icon: <MdPayment className="text-2xl" />,
    title: "Secure Payments",
    desc: "Experience safe and transparent transactions with built-in payment tracking.",
  },
  {
    id: 4,
    icon: <MdAccessTime className="text-2xl" />,
    title: "Event Timelines",
    desc: "Easily manage every milestone and deadline with clear, customizable timelines.",
  },
];

export default function FeaturesSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 70, damping: 12 },
    },
  };

  return (
    <section className="w-full mt-16 bg-brand-ivory py-16 relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8" ref={ref}>
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl lg:text-4xl font-bold text-brand-navy mb-3">
            Key Features
          </h2>
          <p className="text-gray-600 text-base max-w-2xl mx-auto">
            Thoughtfully designed tools to simplify event planning and elevate your workflow.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {keyfeatures.map((feature) => (
            <motion.div
              key={feature.id}
              variants={itemVariants}
              className="group bg-cover bg-no-repeat bg-white/20 bg-center order border-gray-100 hover:border-brand-gold rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300" style={{backgroundImage: `url(${sqz})`}}
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-brand-gold/10 text-brand-gold mb-4">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-brand-navy mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {feature.desc}
              </p>
              <div className="mt-4 text-brand-gold text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                <span>Learn more</span>
                <MdArrowForward className="text-xs" />
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.4 }}
          className="text-center mt-16"
        >
          <Link
            to="/features"
            className="inline-flex items-center gap-2 bg-brand-navy text-brand-ivory px-8 py-3 rounded-xl font-semibold shadow-sm hover:shadow-md hover:bg-brand-charcoal transition-all duration-300"
          >
            Explore All Features
            <MdArrowForward className="text-brand-gold" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
