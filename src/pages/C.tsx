import copy from "copy-to-clipboard";
import { nanoid } from "nanoid";
import { useEffect, useRef } from "react";
import type { RtmEvents } from "../typings/agora-rtm-sdk";
import "./C.css";

type AgoraRTM = typeof window.AgoraRTM;

const rtcConfiguration: RTCConfiguration = {
  iceServers: [
    {
      urls: ["stun:stun1.1.google.com:19302", "stun:stun2.1.google.com:19302"],
    },
  ],
};

const CPage = () => {
  const localStreamRef = useRef<MediaStream>(null!);
  const remoteStreamRef = useRef<MediaStream>(null!);
  const user1Ref = useRef<HTMLVideoElement>(null!);
  const user2Ref = useRef<HTMLVideoElement>(null!);
  const peerConnectionRef = useRef<RTCPeerConnection>(null!);
  const offerSdpRef = useRef<HTMLTextAreaElement>(null!);
  const answerSdpRef = useRef<HTMLTextAreaElement>(null!);
  const rtmClientRef = useRef<ReturnType<AgoraRTM["createInstance"]>>(null!);

  const createPeerConnection = (sdpElement: HTMLTextAreaElement) => {
    const peerConnection = new RTCPeerConnection(rtcConfiguration);
    peerConnectionRef.current = peerConnection;

    let remoteStream = remoteStreamRef.current;
    let localStream = localStreamRef.current;

    remoteStream = new MediaStream();

    user2Ref.current.srcObject = remoteStream;

    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        sdpElement.value = JSON.stringify(peerConnection.localDescription);
      }
    };

    peerConnection.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track);
      });
    };

    return peerConnection;
  };

  const createOffer = async () => {
    const peerConnection = createPeerConnection(offerSdpRef.current);
    const offer = await peerConnection.createOffer();

    await peerConnection.setLocalDescription(offer);
  };

  const createAnswer = async () => {
    const peerConnection = createPeerConnection(answerSdpRef.current);
    let offerValue = offerSdpRef.current.value;

    if (!offerValue) {
      return alert("Retrieve offer from peer first!");
    }

    const offer: RTCSessionDescriptionInit = JSON.parse(offerValue);

    await peerConnection.setRemoteDescription(offer);

    const answer = await peerConnection.createAnswer();

    await peerConnection.setLocalDescription(answer);

    answerSdpRef.current.value = JSON.stringify(answer);
  };

  const addAnswer = async () => {
    const peerConnection = peerConnectionRef.current;
    const answerValue = answerSdpRef.current.value;

    if (!answerValue) {
      return alert("Retrieve answer from peer first!");
    }

    if (peerConnection.currentLocalDescription) {
      return;
    }

    const answer: RTCSessionDescriptionInit = JSON.parse(answerValue);

    await peerConnection.setRemoteDescription(answer);
  };

  useEffect(() => {
    const handlePeerJoined: RtmEvents.RtmChannelEvents["MemberJoined"] = (
      memberId
    ) => {
      console.log("MemberJoined - A new peer has joined this room:", memberId);
      rtmClientRef.current.sendMessageToPeer({ text: "Hey!" }, memberId);
    };

    const handleMessageFromPeer: RtmEvents.RtmClientEvents["MessageFromPeer"] =
      (message, peerId, messageProps) => {
        console.log("Message:", (message as { text: string })?.text);
      };

    (async () => {
      const uid = nanoid(12);
      const agoraAppId = import.meta.env.VITE_AGORA_APP_ID;
      const client = window.AgoraRTM.createInstance(agoraAppId);

      rtmClientRef.current = client;
      await client.login({ uid });

      const channel = client.createChannel("test-channel");

      await channel.join();

      channel.on("MemberJoined", handlePeerJoined);
      client.on("MessageFromPeer", handleMessageFromPeer);

      let localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      localStreamRef.current = localStream;
      user1Ref.current.srcObject = localStream;
    })();
  }, []);

  return (
    <div className="wrapper">
      <h2>CPage</h2>
      <div id="videos">
        <video
          src=""
          className="video-player"
          ref={user1Ref}
          autoPlay
          playsInline
        />
        <video
          src=""
          className="video-player"
          ref={user2Ref}
          autoPlay
          playsInline
        />
      </div>
      <div>
        <button id="create-offer" onClick={createOffer}>
          Create Offer
        </button>
        <button onClick={() => copy(offerSdpRef.current.value)}>
          Copy Offer to clipboard
        </button>
        <label htmlFor="offer-sdp">SDP Offer</label>
        <textarea id="offer-sdp" ref={offerSdpRef}></textarea>
        <hr />
        <button id="create-answer" onClick={createAnswer}>
          Create Answer
        </button>
        <button onClick={() => copy(answerSdpRef.current.value)}>
          Copy Answer to clipboard
        </button>
        <label htmlFor="answer-sdp">SDP Answer</label>
        <textarea id="answer-sdp" ref={answerSdpRef}></textarea>
        <hr />
        <button id="add-answer" onClick={addAnswer}>
          Add Answer
        </button>
      </div>
    </div>
  );
};

export default CPage;
