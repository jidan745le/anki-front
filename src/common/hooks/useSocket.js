import { useEffect, useState } from 'react';
import wsClient from '../websocket/wsClient';

const useSocket = () => {
  const [socket, setSocket] = useState(wsClient.socket);
  const [isConnected, setIsConnected] = useState(wsClient.socket?.connected);

  useEffect(() => {
    // Connect socket when component mounts
    console.log('useSocket.js useEffect connect 1');
    wsClient.connect();
    console.log('useSocket.js useEffect connect 2');

    // Set socket instance and update connection status
    if (wsClient.socket) {
      console.log('useSocket.js useEffect connect 3');
      if (!socket) {
        console.log('useSocket.js useEffect connect 4 !socket');
        setSocket(wsClient.socket);
      }

      // Listen for connection events
      wsClient.socket.on('connect', () => {
        console.log('useSocket.js connect');
        setIsConnected(true);
      });

      wsClient.socket.on('disconnect', () => {
        console.log('useSocket.js disconnect');
        setIsConnected(false);
      });
    }

    // Cleanup on unmount
    return () => {
      if (wsClient.socket) {
        wsClient.socket.off('connect');
        wsClient.socket.off('disconnect');
      }
    };
  }, []);

  // Method to emit events
  const emit = (eventName, data) => {
    if (socket) {
      socket.emit(eventName, data);
    }
  };

  // Method to listen for events
  const on = (eventName, callback) => {
    if (socket) {
      socket.on(eventName, callback);
      // Return cleanup function
      return () => socket.off(eventName, callback);
    }
    return () => {};
  };

  return {
    socket,
    isConnected,
    emit,
    on,
  };
};

export default useSocket;
