import { useChatStore } from "../store/useChatStore.js"
import NoChatSelected from "../components/noChatSelected.jsx";
import ChatContainer from "../components/ChatContainer.jsx";
import Sidebar from "../components/Sidebar.jsx";

const HomePage = () => {
  const {selectedUser} = useChatStore();
  return (
    
    <div className="h-screen bg-base-200">
      <div className="flex items-center justify-center pt-20 px-4">
        <div className="bg-base-100 rounded-lg shadow-xl w-full mx-w-6xl h-[85vh]">
          <div className="flex h-full rounded-lg overflow-hidden">
            <Sidebar />
            {!selectedUser ? <NoChatSelected/> : <ChatContainer/>}
          </div>

        </div>
      </div>
    </div>
  )
}

export default HomePage