import { nanoid } from "nanoid";
import { useCallback, useEffect, useRef } from "react";
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

  const createPeerConnection = ({
    sdpElement,
    memberId,
  }: {
    sdpElement: HTMLTextAreaElement;
    memberId: string;
  }) => {
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
        rtmClientRef.current.sendMessageToPeer(
          {
            text: JSON.stringify({
              type: "candidate",
              candidate: event.candidate,
            }),
          },
          memberId
        );
      }
    };

    peerConnection.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track);
      });
    };

    return peerConnection;
  };

  const createOffer = useCallback(async (memberId: string) => {
    const peerConnection = createPeerConnection({
      sdpElement: offerSdpRef.current,
      memberId,
    });
    const offer = await peerConnection.createOffer();

    rtmClientRef.current.sendMessageToPeer(
      { text: JSON.stringify({ type: "offer", offer: offer }) },
      memberId
    );

    await peerConnection.setLocalDescription(offer);
  }, []);

  const createAnswer = useCallback(async (memberId: string) => {
    const peerConnection = createPeerConnection({
      sdpElement: answerSdpRef.current,
      memberId,
    });
    let offerValue = offerSdpRef.current.value;

    if (!offerValue) {
      return alert("Retrieve offer from peer first!");
    }

    const offer: RTCSessionDescriptionInit = JSON.parse(offerValue);

    await peerConnection.setRemoteDescription(offer);

    const answer = await peerConnection.createAnswer();

    await peerConnection.setLocalDescription(answer);

    answerSdpRef.current.value = JSON.stringify(answer);
    rtmClientRef.current.sendMessageToPeer(
      { text: JSON.stringify({ type: "answer", answer: answer }) },
      memberId
    );
  }, []);

  const addAnswer = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    const handlePeerJoined: RtmEvents.RtmChannelEvents["MemberJoined"] = (
      memberId
    ) => {
      console.log("MemberJoined - A new peer has joined this room:", memberId);
      // rtmClientRef.current.sendMessageToPeer({ text: "Hey!" }, memberId);

      createOffer(memberId);
    };

    const handleMessageFromPeer: RtmEvents.RtmClientEvents["MessageFromPeer"] =
      (message, memberId, messageProps) => {
        const receivedMessage = JSON.parse((message as { text: string })?.text);
        const peerConnection = peerConnectionRef.current;
        console.log("Message:", receivedMessage);

        if (receivedMessage.type === "offer") {
          offerSdpRef.current.value = JSON.stringify(receivedMessage.offer);
          createAnswer(memberId);
        }

        if (receivedMessage.type === "answer") {
          answerSdpRef.current.value = JSON.stringify(receivedMessage.answer);
          addAnswer();
        }

        if (receivedMessage.type === "candidate") {
          if (peerConnection && peerConnection.currentRemoteDescription) {
            peerConnection.addIceCandidate(receivedMessage.candidate);
          }
        }
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
        <label htmlFor="offer-sdp">SDP Offer</label>
        <textarea id="offer-sdp" ref={offerSdpRef}></textarea>
        <hr />
        <label htmlFor="answer-sdp">SDP Answer</label>
        <textarea id="answer-sdp" ref={answerSdpRef}></textarea>
        <hr />
      </div>
    </div>
  );
};

export default CPage;
