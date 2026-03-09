import { useRef, useState, useCallback } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, X } from "lucide-react";
import toast from "react-hot-toast";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const { sendMessage, selectedUser, emitTyping, emitStopTyping } =
    useChatStore();

  // Debounced typing indicator
  const handleTyping = useCallback(() => {
    if (!selectedUser) return;

    emitTyping(selectedUser._id);

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set stop typing after 2 seconds of no input
    typingTimeoutRef.current = setTimeout(() => {
      emitStopTyping(selectedUser._id);
    }, 2000);
  }, [selectedUser, emitTyping, emitStopTyping]);

  const handleTextChange = (e) => {
    setText(e.target.value);
    handleTyping();
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;

    // Clear typing timeout and emit stop
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    try {
      await sendMessage({
        text: text.trim(),
        image: imagePreview,
      });

      setText("");
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  return (
    <div className="p-4 w-full bg-base-100/50 backdrop-blur-md border-t border-base-200/50">
      {imagePreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative group">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-2xl border-2 border-primary/20 shadow-lg"
            />
            <button
              onClick={removeImage}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-base-100 border border-base-300 shadow-md text-base-content
              flex items-center justify-center hover:bg-error hover:text-white transition-colors opacity-0 group-hover:opacity-100"
              type="button"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSendMessage}
        className="flex items-center gap-3 w-full"
      >
        <div className="flex-1 flex items-center bg-base-200/50 rounded-[2rem] border border-base-300/50 focus-within:border-primary/50 focus-within:bg-base-100 transition-all shadow-sm pl-4 pr-1 py-1">
          <input
            type="text"
            className="w-full bg-transparent outline-none h-10 text-sm placeholder-base-content/40"
            placeholder="Type your message..."
            value={text}
            onChange={handleTextChange}
          />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
          />
          <button
            type="button"
            className={`btn btn-circle btn-sm btn-ghost ml-2 ${
              imagePreview
                ? "text-primary"
                : "text-base-content/40 hover:text-base-content/80"
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Image size={18} />
          </button>
        </div>

        <button
          type="submit"
          className="btn btn-circle btn-primary shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow disabled:opacity-50 disabled:shadow-none"
          disabled={!text.trim() && !imagePreview}
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};
export default MessageInput;
