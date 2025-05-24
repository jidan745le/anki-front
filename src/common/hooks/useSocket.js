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
    if (wsClient.client) {
      console.log('useSocket.js useEffect connect 3');

      // Define handler functions
      const handleAuthSuccess = data => {
        console.log('Authentication successful', data);
        setSocket(wsClient.socket);
        setIsConnected(true);
      };

      const handleError = error => {
        console.log('error', error);
        setIsConnected(false);
      };

      const handleDisconnect = () => {
        console.log('disconnect');
        setIsConnected(false);
      };

      // Add event listeners
      wsClient.client.on('auth_success', handleAuthSuccess);
      wsClient.client.on('error', handleError);
      wsClient.client.on('disconnect', handleDisconnect);

      // Cleanup on unmount
      return () => {
        if (wsClient.socket) {
          wsClient.socket.off('connect');
          wsClient.socket.off('disconnect');
          wsClient.client.off('auth_success', handleAuthSuccess);
          wsClient.client.off('error', handleError);
          wsClient.client.off('disconnect', handleDisconnect);
        }
      };
    }

    return () => {}; // Return empty cleanup if wsClient.client doesn't exist
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
