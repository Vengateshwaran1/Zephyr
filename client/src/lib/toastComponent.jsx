import toast from "react-hot-toast";

export const showNewMessageToast = (senderPic, senderName, text, onClick) => {
  toast.custom(
    (t) => (
      <div
        className={`${
          t.visible ? "animate-enter" : "animate-leave"
        } max-w-sm w-full bg-base-100 shadow-2xl rounded-2xl pointer-events-auto flex items-center gap-3 p-4 border border-base-300 backdrop-blur-xl bg-opacity-90 cursor-pointer`}
        onClick={() => {
          toast.dismiss(t.id);
          if (onClick) onClick();
        }}
      >
        <div className="flex-shrink-0">
          <img
            className="h-10 w-10 rounded-full object-cover border border-base-300"
            src={senderPic || "/avatar.png"}
            alt=""
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-base-content truncate">
            {senderName}
          </p>
          <p className="text-sm text-base-content/70 truncate">
            {text || "📷 Sent an image"}
          </p>
        </div>
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
      </div>
    ),
    { duration: 4000, position: "top-center" },
  );
};
