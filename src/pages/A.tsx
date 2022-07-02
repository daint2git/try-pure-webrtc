import { useEffect, useRef, useState } from "react";
import copy from "copy-to-clipboard";

function APage() {
  const [answerState, setAnswerState] = useState("");
  const localConnectionRef = useRef<RTCPeerConnection>(null!);
  const dataChannelRef = useRef<RTCDataChannel>(null!);
  const [message, setMessage] = useState("");
  const ICECandidateRef = useRef("");

  useEffect(() => {
    const localConnection = new RTCPeerConnection();
    localConnectionRef.current = localConnection;

    const dataChannel = localConnection.createDataChannel("channel");
    dataChannelRef.current = dataChannel;

    dataChannel.onmessage = (e) => {
      console.log("just got a message", e.data);
    };

    dataChannel.onopen = (e) => {
      console.log("localConnection - connection opened");
    };

    localConnection.onicecandidate = (e) => {
      console.log(
        "new ICE candidate! reprinting SDP",
        JSON.stringify(localConnection.localDescription)
      );
      ICECandidateRef.current = JSON.stringify(
        localConnection.localDescription
      );
    };

    localConnection
      .createOffer()
      .then((o) => {
        localConnection.setLocalDescription(o);
      })
      .then(() => {
        console.log("set successfully!");
      });
  }, []);

  const setRemoteDescription = () => {
    try {
      const answer: RTCSessionDescriptionInit = JSON.parse(answerState);
      localConnectionRef.current.setRemoteDescription(answer);
    } catch (error) {}
  };

  const sendMessage = () => {
    dataChannelRef.current.send(message);
    setMessage("");
  };

  return (
    <div>
      <h2>APage</h2>
      <input
        type={"text"}
        value={answerState}
        onChange={(e) => setAnswerState(e.currentTarget.value)}
      />
      <button onClick={setRemoteDescription}>set remote description</button>
      <hr />
      <button onClick={() => copy(ICECandidateRef.current)}>
        copy ICE Candidate
      </button>
      <hr />
      <input
        type={"text"}
        value={message}
        onChange={(e) => setMessage(e.currentTarget.value)}
      />
      <button onClick={sendMessage}>send message</button>
    </div>
  );
}

export default APage;
