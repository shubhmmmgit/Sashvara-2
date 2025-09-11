import React, { useEffect } from "react";

const FlashCard = ({ message, onClose, duration = 3000 }) => {
  // Auto close after duration
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        {message}
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    zIndex: 1000,
  },
  card: {
    padding: "20px 40px",
    backgroundColor: "#fff",
    borderRadius: "10px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
    fontSize: "1.2rem",
    fontWeight: "bold",
    color: "#001f3f",
    textAlign: "center",
  },
};

export default FlashCard;
