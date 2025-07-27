import { produce, enableMapSet } from 'immer'
import { useRef, useEffect, useState } from 'react'
import io, { Socket } from 'socket.io-client'

enableMapSet()

function App() {
  /**
* @type [Socket<DefaultEventsMap, DefaultEventsMap>, React. Dispatch<React. SetStateAction<Socket<DefaultEventsMap, DefaultEventsMap>>>]
*/
  const [mySocket, setMySocket] = useState(null)
  const [roomIdToMessageMapping, setRoomIdToMessageMapping] = useState({})
  const [activeRoomId, setActiveRoomId] = useState(null)
  const [message, setMessage] = useState('')


  const [username, setUsername] = useState('')
  const isPromptAlreadyShown = useRef(false)


  const [roomIdToTypingUsernameMapping, setRoomIdToTypingUsernameMapping] = useState({})

  const [roomIdUsernameToTypingTimerIndicatorTimeoutIdMapping, setRoomIdUsernameToTypingTimerIndicatorTimeoutIdMapping] =
    useState({})

  useEffect(() => {

    if (isPromptAlreadyShown.current === false) {
      isPromptAlreadyShown.current = true
      // eslint-disable-next-line no-constant-condition
      while (true) { //makes user not miss the promt dialogue box
        const validUsername = window.prompt('What is your username?')
        if (validUsername?.trim()) {
          setUsername(validUsername)
          break
        }
      }
    }

    const socket = io('ws://localhost:3001', {
      transports: ['websocket'],
    })
    // establish WS connention + set it to state in case use it later
    setMySocket(socket)

    socket.on('roomMessage', (data) => {
      // on room msg on client side + store it 
      setRoomIdToMessageMapping( //immer mutating the statte
        produce((state) => {
          state[data.roomId] = state[data.roomId] || []

          if ( //check for stored msgs (on clients side)
            state[data.roomId].some((obj) => obj.messageId === data.messageId
            )
          ) {
            // this message already exists in state and should not be added again 
          } else {
            state[data.roomId].push(data) // data obj has all room data
          }
        })
      )
    })
    //shows whos typing
    socket.on('userTyping', (data) => {
      const { roomId, username } = data

      setRoomIdToTypingUsernameMapping(
        produce((state) => {
          state[roomId] = state[roomId] || new Set()
          state[roomId].add(username)
        })
      )
      //each TypingUsernameTimer will hv an Id
      const timeoutId = setTimeout(() => {
        setRoomIdToTypingUsernameMapping(
          produce((state) => {
            state[roomId] = state[roomId] || new Set()
            state[roomId].delete(username)
          })
        )
      }, 5000)

      setRoomIdUsernameToTypingTimerIndicatorTimeoutIdMapping(
        produce((state) => {
          //clear old TypingTimer before stting it
          clearTimeout(state[roomId + '-' + username])
          state[roomId + '-' + username] = timeoutId
        })
      )
    })

    return () => {
      socket.close()
    }
  }, [])


  function joinRoomExclusively(roomId) {
    if (mySocket == null) return null

    setActiveRoomId(roomId)
    mySocket.emit('joinRoomExclusively', roomId)
  }
  // send msg to b stored
  function sendMessage() {
    if (mySocket == null) return null
    if (typeof activeRoomId !== 'number') {
      alert('Please be part of a room before sending a message')
      return
    }

    mySocket.emit('sendMessage', {
      roomId: activeRoomId,
      message,
      username,
    })
    setMessage('') //msg disappear in textarea aft sendMessage btn
  }

  function sendTypingIndicator() {
    if (mySocket == null) return null
    if (typeof activeRoomId !== 'number') {
      alert('Please be part of a room before sending a message')
      return
    }

    mySocket.emit('sendTypingIndicator', {
      roomId: activeRoomId,
      username,
    })
  }
  if (mySocket == null) return null
  //extract stored meg 
  const messageOfRoom = roomIdToMessageMapping[activeRoomId] || []
  const typingUsersInTheRoom = roomIdToTypingUsernameMapping[activeRoomId] != null ? [...roomIdToTypingUsernameMapping[activeRoomId]] : [] // say whos typing if there is 

  return (
    <>
      <div className="grid grid-cols-12 divide-x divide-gray-300">
        <aside className="col-span-3 h-screen overflow-y-auto">
          {Array(50)
            .fill(0)
            .map((__, i) => {
              return (
                <div
                  className={
                    'p-2 cursor-pointer ' +
                    (activeRoomId === i + 1
                      ? 'bg-black text-white'
                      : 'hover:bg-gray-200')
                  }
                  key={i}

                  onClick={() => {
                    joinRoomExclusively(i + 1)
                  }}
                >
                  Room #{i + 1}
                </div>
              )
            })}
        </aside >

        <main className="col-span-9 px-8 h-screen overflow-y-auto flex flex-col">
          <p>Your username: {username}</p>
          {typingUsersInTheRoom.length > 0 ? (<p>Typing: {typingUsersInTheRoom.join(', ')}</p>) : null}
          {messageOfRoom.map(({ message, username }, index) => { // render the stored msg with username
            return (
              <div key={index} className="w-full px-4 py-4">
                <b>Sent by {username}</b>
                <p>{message}</p>
              </div>
            )
          })}
          <div className="flex-grow" />

          <div className="mb-8 flex justify-center items-center gap-2">
            <textarea
              id="about"
              name="about"
              rows="2"
              className="block mb-8 w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 flex-grow"
              value={message} //capture msgs
              onChange={(e) => {
                sendTypingIndicator()
                setMessage(e.target.value)
              }}
            ></textarea>

            <button
              type="button"
              className="flex-shrink-0 rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              onClick={sendMessage}
            >
              Send Message
            </button>
          </div>
        </main>
      </div >
    </>
  )
}

export default App

