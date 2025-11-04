import React, { useState } from "react";
import waved from "../assets/waved.jpg";
import eliteplan from "../assets/elite.png";
import rip from "../assets/rip.png";
import squeeze from "../assets/squeeze.png";


import {
  FaSquareXTwitter,
  FaSquareInstagram,
  FaSquareFacebook,
} from "react-icons/fa6";
import { FaPeopleGroup, FaCalendarDays, FaCloudSun } from "react-icons/fa6";
import { TiTickOutline } from "react-icons/ti";
import { FaRegCopyright } from "react-icons/fa";
import {
  MdHandshake,
  MdDashboard,
  MdPayment,
  MdAccessTime,
} from "react-icons/md";
import SignUpForm from "../components/Auth/signupform"; // ✅ Add this import

const cards = [
  {
    id: 1,
    icon: <FaPeopleGroup className="text-2xl text-brand-royal mb-4 " />,
    title: "Find your team",
    desc: "Browse our curated network of experienced planners and vendors to find the perfect team for your event.",
  },
  {
    id: 2,
    icon: <FaCalendarDays className="text-2xl text-brand-royal mb-4" />,
    title: "Plan your event",
    desc: "Collaborate with your team using our integrated planning tools, from budgeting to scheduling.",
  },
  {
    id: 3,
    icon: <FaCloudSun className="text-2xl text-brand-royal mb-4" />,
    title: "Enjoy the day",
    desc: "Relax and enjoy your event knowing every detail is handled by your trusted ElitePlan team.",
  },
];

const keyfeatures = [
  {
    id: 1,
    icon: <MdHandshake className="text-4xl text-brand-gold mb-4 " />,
    title: "vendor matching",
    desc: "Connect with top-rated vendors perfectly suited for your event's needs and budget.",
  },
  {
    id: 2,
    icon: <MdDashboard className="text-4xl text-brand-gold mb-4" />,
    title: "Collaborative dashboard",
    desc: "Keep everyone on the same page with shared dashboards for seamless collaboration",
  },
  {
    id: 3,
    icon: <MdPayment className="text-4xl text-brand-gold mb-4" />,
    title: "secure payments",
    desc: "Enjoy peace of mind with our secure and transparent payment system.",
  },
  {
    id: 4,
    icon: <MdAccessTime className="text-4xl text-brand-gold mb-4" />,
    title: "Event timelines",
    desc: "Stay on track with customizable timelines that outline every detail of your event.",
  },
];

const whyEliteplan = [
  {
    id: 1,
    icon: <TiTickOutline className="text-3xl text-brand-gold h-10" />,
    text: "Save time and reduce stress with our streamlined planning process.",
  },
  {
    id: 2,
    icon: <TiTickOutline className="text-3xl text-brand-gold h-10" />,
    text: "Streamline communication between clients, planners, and vendors.",
  },
  {
    id: 3,
    icon: <TiTickOutline className="text-3xl text-brand-gold h-10" />,
    text: "Access a curated network of top-tier, vetted professionals.",
  },
];

const reviews = [
  {
    id: 1,
    name: "Amelia Brown",
    text: "ElitePlan made planning our wedding completely stress-free! Every detail was handled perfectly, and we couldn’t have asked for a better experience.",
    image:
      "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: 2,
    name: "Sophia Chen",
    text: "As an event vendor, joining ElitePlan connected me with amazing clients. The platform is smooth, transparent, and really professional.",
    image:
      "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: 3,
    name: "Liam Johnson",
    text: "From birthdays to corporate events, ElitePlan helped me find the perfect planner every time. I highly recommend them!",
    image:
      "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=500&q=80",
  },
];

function Connect() {
  const [showSignup, setShowSignup] = useState(false);

  return (
    <>
      <div className="z-100 bg-brand-royal/5 ">


      <div className="pt-16 relative bg-cover bg-center bg-no-repeat bg-white/10">
        {/* HERO */}
        <section className="relative h-[100vh] w-full bg-brand-ivory">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${waved})` }}
          ></div>

          <div className="relative z-10 flex items-center justify-center h-full w-full bg-black/40">
            <div className="text-center w-[90%] max-w-[100vh] rounded-2xl p-10 bg-black/20 text-white shadow-lg">
              <div className="text-3xl md:text-4xl font-bold mb-6">
                Plan your perfect event with{" "}
                <span className="text-brand-gold">Eliteplan</span>
              </div>

              <div className="text-lg md:text-xl font-medium leading-relaxed mb-8">
                Connect with top planners and vendors to create unforgettable
                events. From weddings to corporate occasions, we make planning
                seamless and stress-free.
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row justify-around gap-6 relative">
                <button
                  onClick={() => setShowSignup(true)}
                  className="capitalize py-3 px-8 bg-brand-navy text-white rounded-2xl text-lg font-semibold hover:bg-brand-navy/80 transition-all"
                >
                  Find a Planner
                </button>
                <button
                  onClick={() => setShowSignup(true)}
                  className="capitalize py-3 px-8 bg-brand-royal text-white rounded-2xl text-lg font-semibold hover:bg-brand-royal/80 transition-all"
                >
                  Join as a Vendor
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="h-[40vh] text-center justify-center mt-20 mb-36 items-center grid grid-rows-3 z-10 relative ">
          <div className="capitalize text-2xl font-semibold">
            How elitePlan works
          </div>
          <p className="mt-[-12vh]">
            ElitePlan simpliifies event planning with a streamlined process for
            clients, planners, and vendors.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-14 w-[80%] mx-auto pt-20">
            {cards.map((card) => (
              <div
                key={card.id}
                className="p-5 shadow-xl rounded-lg bg-red/20 backdrop-blur-7xl grid-2 text-center hover:scale-105 transition-transform hover:cursor-pointer bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${squeeze})` }}
              >
                <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full border-2 bg-brand-gold shadow-sm">
                  <div className="flex pt-3 justify-center h-full w-full">
                    {card.icon}
                  </div>
                </div>

                <p className="capitalize font-semibold text-lg mt-4 text-brand-navy">
                  {card.title}
                </p>
                <p className="text-sm text-gray-700">{card.desc}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="w-full  py-20 px-10 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-10 max-w-6xl mx-auto">
            {/* Left wing */}
            <div className="flex flex-col justify-center space-y-5">
              <p className="capitalize text-2xl md:text-3xl font-semibold text-brand-navy">
                Why choose ElitePlan?
              </p>

              <p className="text-gray-700 font-semibold text-sm md:text-base w-[90%] md:w-[80%]">
                We’re more than just a platform — we’re your dedicated partner
                in creating unforgettable events.
              </p>

              <ul className="space-y-3">
                {whyEliteplan.map((line) => (
                  <li key={line.id} className="flex items-start gap-3">
                    <span className="text-brand-gold text-lg pt-1">
                      {line.icon}
                    </span>
                    <span className="text-gray-800 text-sm md:text-base leading-relaxed w-[85%]">
                      {line.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right wing */}
            <div className="h-[50vh] md:h-[60vh] rounded-2xl bg-[url('https://i.pinimg.com/1200x/70/5b/45/705b451577f890a84e1b2df324221af7.jpg')] bg-cover bg-center shadow-md"></div>
          </div>
        </section>

        {/* Key features */}
        <div className="font-semibold text-3xl text-center py-10 underline">
          Key Features
        </div>

        <section className="w-full bg-brand-ivory py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto px-6">
            {keyfeatures.map((feature) => (
              <div
                key={feature.id}
                className="flex flex-col space-y-3 bg-white shadow-md rounded-xl p-6 bg-black/50 hover:scale-105 transition-transform duration-300 hover:cursor-pointer bg-center bg-cover bg-no-repeat"
                style={{ backgroundImage: `url(${squeeze})` }}
              >
                <div className="text-brand-gold">{feature.icon}</div>
                <p className="capitalize font-semibold text-lg text-brand-navy">
                  {feature.title}
                </p>
                <p className="text-[12px] text-gray-700 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        <div className="font-semibold text-3xl text-center py-10 ">
          Our Events
        </div>

        <section className="h-[150vh] px-16 relative pt-10 bg-brand-ivory">
          <div className="grid grid-cols-4 gap-4 h-full">
            {/* Column 1 - Tallest */}
            <div className="grid grid-rows-3 gap-4">
              <div className="bg-[url('https://i.pinimg.com/1200x/26/89/8e/26898e130bfcafb4aa1c79e01bbd07f9.jpg')] bg-center bg-cover "></div>
              <div className="bg-[url('https://i.pinimg.com/736x/8e/cf/53/8ecf53d77f423095776ee9d9c1d2ac16.jpg')] bg-center bg-cover "></div>
              <div className="bg-[url('https://i.pinimg.com/1200x/42/39/c8/4239c81f40ab885c595a4f944149be8d.jpg')] bg-center bg-cover "></div>
            </div>

            {/* Column 2 */}
            <div className="grid grid-rows-3 gap-4 scale-y-[0.9] origin-top">
              <div className="bg-[url('https://i.pinimg.com/1200x/47/e3/75/47e3757c0fce6e49a218e03a622de78e.jpg')] bg-center bg-cover "></div>
              <div className="bg-[url('https://i.pinimg.com/736x/73/54/10/735410f1425c85c8aabca347ff55ba6f.jpg')] bg-center bg-cover "></div>
              <div className="bg-[url('https://i.pinimg.com/736x/a3/e4/27/a3e427aea5d9a34f30ddff072bc978aa.jpg')] bg-center bg-cover "></div>
            </div>

            {/* Column 3 */}
            <div className="grid grid-rows-3 gap-4 scale-y-[0.8] origin-top">
              <div className="bg-[url('https://i.pinimg.com/736x/7a/44/d8/7a44d83a849f25fc663af00fa70bae61.jpg')] bg-center bg-cover "></div>
              <div className="bg-[url('https://i.pinimg.com/1200x/53/48/19/5348191df3571fb0634922266812355e.jpg')] bg-center bg-cover "></div>
              <div className="bg-[url('https://i.pinimg.com/736x/97/52/c3/9752c3e76cb3519c682cf5cd993c9ce3.jpg')] bg-center bg-cover "></div>
            </div>

            {/* Column 4 - Shortest */}
            <div className="grid grid-rows-3 gap-4 scale-y-[0.7] origin-top">
              <div className="bg-[url('https://i.pinimg.com/1200x/7b/c7/dd/7bc7dd20a6178ca0d0583e2f7f9888b3.jpg')] bg-center bg-cover "></div>
              <div className="bg-[url('https://i.pinimg.com/736x/3f/e7/33/3fe7331936bc77ab68c10c35b6cb47ba.jpg')] bg-center bg-cover "></div>
              <div className="bg-[url('https://i.pinimg.com/1200x/5e/4f/d5/5e4fd5b93fdfa1949c0c4e857ce90b56.jpg')] bg-center bg-cover "></div>
            </div>
          </div>

          <button className="absolute top-[135vh] right-60 text-5xl font-semibold font-waterfall">
            Book yours Now
          </button>
          <img className="absolute top-[90vh] right-6" src={rip} alt="" />
        </section>

        <section className="h-[40vh] my-10 bg-white">
          <div className="text-center flex flex-col justify-center items-center py-16 bg-brand-ivory">
            <p className="text-2xl font-semibold text-brand-navy mb-10">
              What Our Users Say
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 w-[85%] mx-auto">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="bg-white rounded-2xl shadow-lg p-6 flex flex-col justify-between hover:scale-105 transition-transform duration-300"
                >
                  <p className="text-gray-700 italic mb-6">“{review.text}”</p>

                  <div className="flex items-center justify-left gap-3">
                    <img
                      src={review.image}
                      alt={review.name}
                      className="rounded-full h-14 w-14 object-cover border-2 border-brand-gold"
                    />
                    <p className="font-semibold text-brand-navy">
                      {review.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="h-[36vh] mt-[30vh] bg-brand-royal">
          <div className="text-center pt-10 items-center justify-center space-y-4">
    <p className="text-2xl font-semibold text-white">
      Ready to plan your perfect event?
    </p>
    
    {/* Typing animation text */}
    <p className="mover text-white font-thin text-lg max-w-2xl mx-auto">
      Join ElitePlan today and experience the future of event planning.
    </p>

    <button
      onClick={() => setShowSignup(true)}
      className="p-4 text-sm font-bold rounded-2xl text-brand-royal bg-white hover:bg-brand-royal hover:text-white transition-all hover:border hover:border-white mt-6 transform hover:scale-105 duration-300"
    >
      Start Planning your Event
    </button>
  </div>
        </section>

        <footer className="h-[36vh] bg-brand-navy grid grid-cols-5 gap-10 px-20">
          <div className="grid grid-rows-2 pt-10">
            <img className="h-20" src={eliteplan} alt="" />

            <div className="grid grid-cols-[1fr_8fr] h-20 gap-2 text-brand-ivory">
              <FaRegCopyright className="h-7" />

              <p>
                2024 ElitePlan. <br />
                All rights reserved.{" "}
              </p>
            </div>
          </div>
          <div className="grid grid-rows-[1fr_3fr] py-10 text-xl font-semibold">
            <p className="text-brand-gold">Company</p>
            <ul className="space-y-2 text-brand-ivory text-sm">
              <li>About Us</li>
              <li>Blog</li>
              <li>Careers</li>
              <li>Press</li>
            </ul>
          </div>
          <div className="grid grid-rows-[1fr_3fr] py-10 text-xl font-semibold">
            <p className="text-brand-gold">Resources</p>
            <ul className="space-y-2 text-brand-ivory text-sm">
              <li>Pricing</li>
              <li>Help Center</li>
              <li>Contact Us</li>
            </ul>
          </div>
          <div className="grid grid-rows-[1fr_3fr] py-10 text-xl font-semibold">
            <p className="text-brand-gold">Legal</p>
            <ul className="space-y-2 text-brand-ivory text-sm">
              <li>Terms of Service</li>
              <li>Privacy Policy</li>
              <li>Cookie Policy</li>
            </ul>
          </div>
          <div className="grid grid-rows-[1fr_3fr] py-10 text-xl font-semibold">
            <p className="text-brand-gold">Follow Us</p>
            <ul className="flex space-x-5 text-4xl text-brand-ivory">
              <FaSquareFacebook />
              <FaSquareInstagram />
              <FaSquareXTwitter />
            </ul>
          </div>
        </footer>

        {showSignup && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowSignup(false)}
          >
            <div
              className="relative"
              onClick={(e) => e.stopPropagation()} // prevents closing when clicked inside
            >
              <SignUpForm />
            </div>
          </div>
        )}
      </div>
            </div>
    </>
  );
}

export default Connect;
