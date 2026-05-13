import { useRef, useState, useCallback } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, X } from "lucide-react";
import toast from "react-hot-toast";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const [isSending, setIsSending] = useState(false);
  const {
    sendMessage,
    selectedUser,
    selectedGroup,
    emitTyping,
    emitStopTyping,
  } = useChatStore();

  // Debounced typing indicator
  const handleTyping = useCallback(() => {
    if (!selectedUser && !selectedGroup) return;

    emitTyping(selectedUser?._id, selectedGroup?._id);

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set stop typing after 2 seconds of no input
    typingTimeoutRef.current = setTimeout(() => {
      emitStopTyping(selectedUser?._id, selectedGroup?._id);
    }, 2000);
  }, [selectedUser, selectedGroup, emitTyping, emitStopTyping]);

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

    // Optimistically clear the input so user can't spam multi-send
    const messageToSend = text.trim();
    const imageToSend = imagePreview;
    
    setText("");
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    
    setIsSending(true);

    try {
      await sendMessage({
        text: messageToSend,
        image: imageToSend,
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      // Restore input on failure
      setText(messageToSend);
      setImagePreview(imageToSend);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="mx-3 mb-3 sm:mx-6 sm:mb-6 p-3 sm:p-4 w-[calc(100%-1.5rem)] sm:w-[calc(100%-3rem)] glass-island rounded-[2rem] flex-shrink-0 z-20 sticky bottom-0">
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
          <div className={`flex-1 flex items-center bg-base-200/50 rounded-[2rem] border border-base-300/50 focus-within:border-primary/50 focus-within:bg-base-100 transition-all shadow-sm pl-4 pr-1 py-1 ${isSending ? 'opacity-50 pointer-events-none' : ''}`}>
          <input
            type="text"
            className="w-full bg-transparent outline-none h-10 text-sm placeholder-base-content/40"
            placeholder={isSending ? "Sending..." : "Type your message..."}
            value={text}
            onChange={handleTextChange}
            disabled={isSending}
          />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
            disabled={isSending}
          />
          <button
            type="button"
            className={`btn btn-circle btn-sm btn-ghost ml-2 ${
              imagePreview
                ? "text-primary"
                : "text-base-content/40 hover:text-base-content/80"
            }`}
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending}
          >
            <Image size={18} />
          </button>
        </div>

        <button
          type="submit"
          className="btn btn-circle btn-primary shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow disabled:opacity-50 disabled:shadow-none"
          disabled={(!text.trim() && !imagePreview) || isSending}
        >
          {isSending ? <span className="loading loading-spinner loading-sm"></span> : <Send size={18} />}
        </button>
      </form>
    </div>
  );
};
export default MessageInput;
