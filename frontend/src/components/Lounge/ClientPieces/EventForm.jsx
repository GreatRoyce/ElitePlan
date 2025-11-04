// EventForm.jsx
import React, { useState } from 'react';

const EventForm = ({ onSubmit, initialData = {}, isEditing = false }) => {
  const [formData, setFormData] = useState({
    // Client Information
    fullName: initialData.fullName || '',
    contactNumber: initialData.contactNumber || '',
    emailAddress: initialData.emailAddress || '',
    companyOrganization: initialData.companyOrganization || '',

    // Event Details
    eventName: initialData.eventName || '',
    eventType: initialData.eventType || '',
    eventDates: initialData.eventDates || '',
    eventTimes: initialData.eventTimes || '',
    estimatedDuration: initialData.estimatedDuration || '',
    eventTheme: initialData.eventTheme || '',
    expectedGuests: initialData.expectedGuests || '',

    // Venue Details
    venueName: initialData.venueName || '',
    venueAddress: initialData.venueAddress || '',
    venueContactPerson: initialData.venueContactPerson || '',
    venueContactInfo: initialData.venueContactInfo || '',
    venueCapacity: initialData.venueCapacity || '',
    venueRestrictions: initialData.venueRestrictions || '',

    // Budget Information
    overallBudget: initialData.overallBudget || '',
    budgetAllocation: initialData.budgetAllocation || '',

    // Vendors
    cateringService: initialData.cateringService || '',
    cateringContact: initialData.cateringContact || '',
    photographer: initialData.photographer || '',
    photographerContact: initialData.photographerContact || '',
    florist: initialData.florist || '',
    floristContact: initialData.floristContact || '',
    decorCompany: initialData.decorCompany || '',
    decorContact: initialData.decorContact || '',
    entertainment: initialData.entertainment || '',
    entertainmentContact: initialData.entertainmentContact || '',
    transportationVendors: initialData.transportationVendors || '',
    transportationContact: initialData.transportationContact || '',

    // Security & Safety
    securityCompany: initialData.securityCompany || '',
    securityContact: initialData.securityContact || '',
    emergencyContacts: initialData.emergencyContacts || '',
    medicalArrangements: initialData.medicalArrangements || '',

    // Guest Management
    rsvpList: initialData.rsvpList || '',
    specialGuests: initialData.specialGuests || '',
    dietaryRestrictions: initialData.dietaryRestrictions || '',
    accessibilityRequirements: initialData.accessibilityRequirements || '',

    // Event Program
    eventSchedule: initialData.eventSchedule || '',
    speechesPerformances: initialData.speechesPerformances || '',
    specialCeremonies: initialData.specialCeremonies || '',

    // Permits & Legal
    eventPermits: initialData.eventPermits || '',
    insuranceRequirements: initialData.insuranceRequirements || '',

    // Miscellaneous
    audioVisualNeeds: initialData.audioVisualNeeds || '',
    lightingSound: initialData.lightingSound || '',
    parkingArrangements: initialData.parkingArrangements || '',
    guestTransportation: initialData.guestTransportation || '',
    specialRequests: initialData.specialRequests || '',

    // Approval & Signatures
    clientSignature: initialData.clientSignature || '',
    eventDate: initialData.eventDate || '',
    plannerNotes: initialData.plannerNotes || '',
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Basic validation
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.emailAddress.trim()) newErrors.emailAddress = 'Email is required';
    if (!formData.eventName.trim()) newErrors.eventName = 'Event name is required';
    if (!formData.eventDates.trim()) newErrors.eventDates = 'Event dates are required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(formData);
  };

  const renderSection = (title, fields) => (
    <div className="mb-8 p-6 bg-white rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-xl font-semibold text-gray-800 border-b-2 border-blue-500 pb-3 mb-6">
        {title}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {fields}
      </div>
    </div>
  );

  const inputField = (label, name, type = 'text', placeholder = '', required = false) => (
    <div className="flex flex-col space-y-2">
      <label htmlFor={name} className="text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {type === 'textarea' ? (
        <textarea
          id={name}
          name={name}
          value={formData[name]}
          onChange={handleChange}
          placeholder={placeholder}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
            errors[name] ? 'border-red-500' : 'border-gray-300'
          }`}
          rows={3}
        />
      ) : (
        <input
          type={type}
          id={name}
          name={name}
          value={formData[name]}
          onChange={handleChange}
          placeholder={placeholder}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
            errors[name] ? 'border-red-500' : 'border-gray-300'
          }`}
        />
      )}
      {errors[name] && (
        <span className="text-red-500 text-xs font-medium">{errors[name]}</span>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-gray-50 rounded-xl shadow-sm p-6">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
          {isEditing ? 'Edit Event Details' : 'New Event Planning Form'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Client Information */}
          {renderSection('Client Information', [
            inputField('Full Name', 'fullName', 'text', 'Enter full name', true),
            inputField('Contact Number', 'contactNumber', 'tel', 'Enter phone number'),
            inputField('Email Address', 'emailAddress', 'email', 'Enter email address', true),
            inputField('Company/Organization', 'companyOrganization', 'text', 'If applicable')
          ])}

          {/* Event Details */}
          {renderSection('Event Details', [
            inputField('Event Name/Title', 'eventName', 'text', 'Enter event name', true),
            inputField('Event Type', 'eventType', 'text', 'e.g., wedding, birthday, corporate'),
            inputField('Event Date(s)', 'eventDates', 'text', 'Enter event date(s)', true),
            inputField('Event Time(s)', 'eventTimes', 'text', 'Enter event time(s)'),
            inputField('Estimated Duration', 'estimatedDuration', 'text', 'e.g., 4 hours'),
            inputField('Event Theme/Style/Color Scheme', 'eventTheme', 'text', 'Describe theme'),
            inputField('Expected Number of Guests', 'expectedGuests', 'number', '0')
          ])}

          {/* Venue Details */}
          {renderSection('Venue Details', [
            inputField('Venue Name', 'venueName', 'text', 'Enter venue name'),
            inputField('Venue Address', 'venueAddress', 'text', 'Full address'),
            inputField('Venue Contact Person', 'venueContactPerson', 'text', 'Contact name'),
            inputField('Venue Contact Info', 'venueContactInfo', 'text', 'Phone/email'),
            inputField('Venue Capacity', 'venueCapacity', 'number', 'Maximum guests'),
            inputField('Venue Restrictions', 'venueRestrictions', 'textarea', 'Decor, noise, catering restrictions')
          ])}

          {/* Budget Information */}
          {renderSection('Budget Information', [
            inputField('Overall Budget', 'overallBudget', 'number', 'Total budget amount'),
            inputField('Allocation Preferences', 'budgetAllocation', 'textarea', 'Catering, decor, entertainment, etc.')
          ])}

          {/* Vendors */}
          {renderSection('Vendors & Suppliers', [
            inputField('Catering Service(s)', 'cateringService', 'text', 'Catering company'),
            inputField('Catering Contact Info', 'cateringContact', 'text', 'Phone/email'),
            inputField('Photographer/Videographer', 'photographer', 'text', 'Photographer name'),
            inputField('Photographer Contact', 'photographerContact', 'text', 'Phone/email'),
            inputField('Florist', 'florist', 'text', 'Florist company'),
            inputField('Florist Contact', 'floristContact', 'text', 'Phone/email'),
            inputField('Decor Company', 'decorCompany', 'text', 'Decor provider'),
            inputField('Decor Contact', 'decorContact', 'text', 'Phone/email'),
            inputField('Entertainment', 'entertainment', 'text', 'DJ/Band/Performers'),
            inputField('Entertainment Contact', 'entertainmentContact', 'text', 'Phone/email'),
            inputField('Transportation/Logistics', 'transportationVendors', 'text', 'Transportation providers'),
            inputField('Transportation Contact', 'transportationContact', 'text', 'Phone/email')
          ])}

          {/* Security & Safety */}
          {renderSection('Security & Safety', [
            inputField('Security Company/Personnel', 'securityCompany', 'text', 'Security provider'),
            inputField('Security Contact', 'securityContact', 'text', 'Phone/email'),
            inputField('Emergency Contact(s)', 'emergencyContacts', 'textarea', 'Emergency contacts'),
            inputField('First Aid/Medical Arrangements', 'medicalArrangements', 'textarea', 'Medical arrangements')
          ])}

          {/* Guest Management */}
          {renderSection('Guest Management', [
            inputField('RSVP List or Expected Guest List', 'rsvpList', 'textarea', 'Guest names/details'),
            inputField('Special Guests or VIPs', 'specialGuests', 'textarea', 'VIP guests'),
            inputField('Dietary Restrictions', 'dietaryRestrictions', 'textarea', 'Special dietary needs'),
            inputField('Accessibility Requirements', 'accessibilityRequirements', 'textarea', 'Special accommodations')
          ])}

          {/* Event Program */}
          {renderSection('Event Program', [
            inputField('Planned Schedule of Activities', 'eventSchedule', 'textarea', 'Timeline of events'),
            inputField('Speeches or Performances', 'speechesPerformances', 'textarea', 'Scheduled speeches/performances'),
            inputField('Special Ceremonies or Rituals', 'specialCeremonies', 'textarea', 'Special ceremonies')
          ])}

          {/* Permits & Legal */}
          {renderSection('Permits & Legal Requirements', [
            inputField('Event Permits', 'eventPermits', 'textarea', 'Required permits'),
            inputField('Insurance Requirements', 'insuranceRequirements', 'textarea', 'Insurance details')
          ])}

          {/* Miscellaneous */}
          {renderSection('Miscellaneous', [
            inputField('Audio/Visual Needs', 'audioVisualNeeds', 'textarea', 'Microphones, projectors, screens'),
            inputField('Lighting & Sound Preferences', 'lightingSound', 'textarea', 'Lighting and sound requirements'),
            inputField('Parking Arrangements', 'parkingArrangements', 'textarea', 'Parking details'),
            inputField('Transportation Needs for Guests', 'guestTransportation', 'textarea', 'Guest transportation'),
            inputField('Special Requests or Notes', 'specialRequests', 'textarea', 'Additional notes')
          ])}

          {/* Approval & Signatures */}
          {renderSection('Approval & Signatures', [
            inputField('Client Signature', 'clientSignature', 'text', 'Client signature'),
            inputField('Date', 'eventDate', 'date', 'Event date'),
            inputField('Event Planner Notes/Confirmation', 'plannerNotes', 'textarea', 'Planner notes and confirmation')
          ])}

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-8 border-t border-gray-200">
            <button
              type="submit"
              className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
            >
              {isEditing ? 'Update Event' : 'Create Event'}
            </button>
            <button
              type="button"
              className="px-8 py-3 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventForm;