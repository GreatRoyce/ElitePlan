import React, { useRef, useState } from "react";
import { FaPeopleGroup, FaCalendarDays, FaCloudSun } from "react-icons/fa6";
import { FaRegCopyright } from "react-icons/fa";
import eliteplan from "../assets/elite.png";
import {
  FaSquareXTwitter,
  FaSquareInstagram,
  FaSquareFacebook,
} from "react-icons/fa6";
import { motion, useInView } from "framer-motion";
import SignUpForm from "../../src/components/Auth/signupform"; // adjust import path as needed

const steps = [
  {
    id: 1,
    icon: <FaPeopleGroup className="text-xl" />,
    title: "Find Your Team",
    desc: "Browse our curated network of experienced planners and vendors to find the perfect team for your event.",
  },
  {
    id: 2,
    icon: <FaCalendarDays className="text-xl" />,
    title: "Plan Your Event",
    desc: "Collaborate with your team using integrated tools for budgeting, scheduling, and communication.",
  },
  {
    id: 3,
    icon: <FaCloudSun className="text-xl" />,
    title: "Enjoy the Day",
    desc: "Relax and celebrate knowing every detail is handled seamlessly by your ElitePlan team.",
  },
];

const footerSections = [
  { title: "Company", links: ["About Us", "Blog", "Careers", "Press"] },
  { title: "Resources", links: ["Pricing", "Help Center", "Contact Us"] },
  { title: "Legal", links: ["Terms of Service", "Privacy Policy", "Cookie Policy"] },
];

const socials = [
  { icon: <FaSquareFacebook />, hover: "hover:text-blue-400" },
  { icon: <FaSquareInstagram />, hover: "hover:text-pink-400" },
  { icon: <FaSquareXTwitter />, hover: "hover:text-gray-400" },
];

export default function HowItWorks() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [showSignup, setShowSignup] = useState(false);

  const fadeUp = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  return (
    <div className="min-h-screen bg-brand-ivory flex flex-col justify-between">
      {/* Section */}
      <section className="py-32" ref={ref}>
        <div className="max-w-6xl mx-auto px-6 text-center">
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="text-3xl md:text-4xl font-bold text-brand-navy mb-3"
          >
            How ElitePlan Works
          </motion.h2>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            transition={{ delay: 0.2 }}
            className="text-gray-600 text-base max-w-2xl mx-auto mb-12"
          >
            A simple, structured journey from idea to celebration — built to make
            planning effortless.
          </motion.p>

          <motion.div
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            variants={{
              visible: {
                transition: { staggerChildren: 0.15 },
              },
            }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {steps.map((step) => (
              <motion.div
                key={step.id}
                variants={fadeUp}
                className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 p-8"
              >
                <div className="flex justify-center items-center w-12 h-12 mx-auto mb-5 rounded-lg bg-brand-gold/10 text-brand-gold text-2xl">
                  {step.icon}
                </div>
                <h3 className="text-lg font-semibold text-brand-navy mb-2">
                  {step.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>

          {/* ✅ Get Started Modal Trigger */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            transition={{ delay: 0.6 }}
            className="mt-12"
          >
            <button
              onClick={() => setShowSignup(true)}
              className="inline-flex items-center gap-2 bg-brand-navy text-brand-ivory px-8 py-3 rounded-xl font-semibold hover:bg-brand-charcoal transition-all duration-300"
            >
              Get Started Today
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-brand-navy text-brand-ivory py-10">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Logo */}
          <div className="flex flex-col items-center md:items-start">
            <img src={eliteplan} alt="ElitePlan Logo" className="h-16 mb-3" />
            <p className="flex items-center gap-1 text-sm text-brand-ivory/70">
              <FaRegCopyright /> 2024 ElitePlan. All rights reserved.
            </p>
          </div>

          {/* Links */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h4 className="text-brand-gold font-semibold mb-3">{section.title}</h4>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li
                    key={link}
                    className="text-brand-ivory/70 text-sm hover:text-brand-gold cursor-pointer transition-colors"
                  >
                    {link}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Socials */}
          <div>
            <h4 className="text-brand-gold font-semibold mb-3">Follow Us</h4>
            <div className="flex space-x-4 text-2xl">
              {socials.map((s, i) => (
                <div
                  key={i}
                  className={`cursor-pointer text-brand-ivory/70 ${s.hover} transition-colors`}
                >
                  {s.icon}
                </div>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* ✅ Signup Modal */}
      {showSignup && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowSignup(false)}
        >
          <div
            className="relative"
            onClick={(e) => e.stopPropagation()}
          >
            <SignUpForm />
          </div>
        </div>
      )}
    </div>
  );
}
