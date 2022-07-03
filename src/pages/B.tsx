import copy from "copy-to-clipboard";
import { useEffect, useRef, useState } from "react";

function BPage() {
  const [offerState, setOfferState] = useState("");
  const remoteConnectionRef = useRef<RTCPeerConnection>(null!);
  const [receivedMessages, setReceivedMessages] = useState<string[]>([]);
  const ICECandidateRef = useRef("");
  const dataChannelRef = useRef<RTCDataChannel>(null!);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const remoteConnection = new RTCPeerConnection();
    remoteConnectionRef.current = remoteConnection;

    remoteConnection.onicecandidate = (e) => {
      console.log(
        "new ICE candidate! reprinting SDP",
        JSON.stringify(remoteConnection.localDescription)
      );
      ICECandidateRef.current = JSON.stringify(
        remoteConnection.localDescription
      );
    };

    remoteConnection.ondatachannel = (e) => {
      const dataChannel = e.channel;
      dataChannelRef.current = dataChannel;

      dataChannel.onmessage = (e) => {
        console.log("new message from client!", e.data);
        setReceivedMessages((prev) => [...prev, e.data]);
      };
      dataChannel.onopen = () => {
        console.log("remoteConnection - connection opened");
      };
    };
  }, []);

  const setRemoteDescription = () => {
    const remoteConnection = remoteConnectionRef.current;

    try {
      const offer: RTCSessionDescriptionInit = JSON.parse(offerState);
      console.log({ offer });

      remoteConnection.setRemoteDescription(offer).then(() => {
        console.log("offer set!");
      });
      remoteConnection
        .createAnswer()
        .then((a) => {
          remoteConnection.setLocalDescription(a);
        })
        .then(() => {
          console.log("answer created");
        });
    } catch (error) {
      console.log(error);
    }
  };

  const sendMessage = () => {
    dataChannelRef.current.send(message);
    setMessage("");
  };

  return (
    <div>
      <h2>BPage</h2>
      <input
        type={"text"}
        value={offerState}
        onChange={(e) => setOfferState(e.currentTarget.value)}
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
      <hr />
      <h3>Received messages</h3>
      <ul>
        {receivedMessages.map((message, i) => {
          return <li key={i}>{message}</li>;
        })}
      </ul>
    </div>
  );
}

export default BPage;
