import React, { useState } from "react";
import { LogOut as LogOutIcon, Menu as MenuIcon, X as CloseIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import elite from "../../../../src/assets/elite.png";

export default function Sidebar({ activeSection, setActiveSection, navItems }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false); // mobile menu

  return (
    <>
  {/* Hamburger button for mobile */}
<div className="sm:hidden mb-[142%] flex items-center justify-between bg-white border-b border-brand-gold/50 p-2 fixed">
  <button
    onClick={() => setIsOpen(true)}
    className=" rounded-md hover:bg-brand-ivory transition-colors duration-200"
  >
    <MenuIcon size={24} className="text-brand-navy" />
  </button>

  {/* Mobile logo centered */}
  {/* <img
    src={elite}
    alt="Elite Plan"
    className="h-12 w-12 object-contain"
  /> */}
</div>

      {/* Sidebar for larger screens */}
      <aside className="hidden sm:flex w-64 bg-brand-ivory text-white border-r shadow-lg flex-col">
        <div className="flex justify-center border-b border-gray-200">
          <img
            src={elite}
            alt="Elite Plan"
            className="h-20 w-20 object-cover"
          />
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`flex items-center justify-between w-full p-3 rounded-lg transition-colors ${
                activeSection === item.id
                  ? "bg-blue-50 text-blue-600 border border-blue-200"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center space-x-3">
                <span>{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </div>
              {item.count !== undefined && (
                <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => navigate("/logout")}
            className="flex items-center space-x-3 w-full p-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <LogOutIcon size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/30"
            onClick={() => setIsOpen(false)}
          ></div>

          <div className="relative w-64 bg-white h-full flex flex-col border-r border-gray-200 shadow-lg">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <img
                src={elite}
                alt="Elite Plan"
                className="h-12 w-12 object-contain"
              />
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-md hover:bg-gray-100 transition-colors"
              >
                <CloseIcon size={20} />
              </button>
            </div>

            <nav className="flex-1 p-4 space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSection(item.id);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between w-full p-3 rounded-lg transition-colors ${
                    activeSection === item.id
                      ? "bg-blue-50 text-blue-600 border border-blue-200"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span>{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </div>
                  {item.count !== undefined && (
                    <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">
                      {item.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>

            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => navigate("/logout")}
                className="flex items-center space-x-3 w-full p-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <LogOutIcon size={20} />
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
