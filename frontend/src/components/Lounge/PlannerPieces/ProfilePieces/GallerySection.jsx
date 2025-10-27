import React from "react";
import { Plus, Trash2 } from "lucide-react";

export default function GallerySection({ formData, setFormData, galleryInputRef }) {
  const handleGalleryAdd = (e) => {
    const files = Array.from(e.target.files);
    const newImages = [];

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newImages.push(reader.result);
        setFormData((prev) => ({ ...prev, gallery: [...prev.gallery, ...newImages] }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDelete = (index) => {
    setFormData((prev) => ({
      ...prev,
      gallery: prev.gallery.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="bg-gray-50 p-6 rounded-2xl shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Gallery</h2>
        <button
          type="button"
          onClick={() => galleryInputRef.current.click()}
          className="flex items-center gap-1 bg-brand-gold text-brand-navy px-3 py-2 rounded-xl text-sm"
        >
          <Plus size={16} /> Add Image
        </button>
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleGalleryAdd}
          className="hidden"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {formData.gallery.map((img, i) => (
          <div key={i} className="relative group">
            <img src={img} alt={`Gallery ${i}`} className="rounded-xl w-full h-32 object-cover" />
            <button
              type="button"
              onClick={() => handleDelete(i)}
              className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
