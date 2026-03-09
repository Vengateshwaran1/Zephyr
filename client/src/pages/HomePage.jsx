import { useChatStore } from "../store/useChatStore.js";
import NoChatSelected from "../components/noChatSelected.jsx";
import ChatContainer from "../components/ChatContainer.jsx";
import Sidebar from "../components/Sidebar.jsx";

const HomePage = () => {
  const { selectedUser } = useChatStore();
  return (
    <div className="h-screen bg-base-200">
      <div className="flex items-center justify-center pt-24 px-4 sm:px-6">
        <div className="bg-base-100/95 backdrop-blur-2xl rounded-[2rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] border border-base-content/5 w-full max-w-7xl h-[85vh]">
          <div className="flex h-full overflow-hidden">
            <div
              className={`h-full w-full lg:w-72 flex-shrink-0 transition-all duration-300 ${
                selectedUser ? "hidden lg:flex" : "flex"
              }`}
            >
              <Sidebar />
            </div>

            <div
              className={`h-full flex-1 transition-all duration-300 ${
                !selectedUser ? "hidden lg:flex" : "flex"
              }`}
            >
              {!selectedUser ? <NoChatSelected /> : <ChatContainer />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
