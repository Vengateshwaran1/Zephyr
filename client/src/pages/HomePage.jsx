import { useChatStore } from "../store/useChatStore.js";
import NoChatSelected from "../components/noChatSelected.jsx";
import ChatContainer from "../components/ChatContainer.jsx";
import Sidebar from "../components/Sidebar.jsx";

const HomePage = () => {
  const { selectedUser, selectedGroup } = useChatStore();
  const chatOpen = selectedUser || selectedGroup;
  return (
    <div className="h-screen w-full flex items-center justify-center pt-16">
      <div className="flex items-center justify-center w-full px-2 sm:px-4 md:px-8">
        <div className="glass-panel rounded-[2rem] w-full max-w-[1400px] h-[calc(100vh-5.5rem)] overflow-hidden">
          <div className="flex h-full">
            {/* Sidebar Wrapper */}
            <div
              className={`h-full border-r border-white/5 transition-all duration-500 ease-in-out ${
                chatOpen ? "hidden lg:flex lg:w-80 xl:w-96" : "flex w-full"
              }`}
            >
              <Sidebar />
            </div>

            {/* Chat Container Wrapper */}
            <div
              className={`h-full flex-1 transition-all duration-500 ease-in-out relative ${
                !chatOpen ? "hidden lg:flex" : "flex"
              }`}
            >
              {!chatOpen ? <NoChatSelected /> : <ChatContainer />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
