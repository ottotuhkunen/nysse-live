import React, { useState, useEffect, useRef } from 'react';
import '../Alerts.css';

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [activeAlertIndex, setActiveAlertIndex] = useState(0);
  const tickerRef = useRef(null);
  const containerRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await fetch(`https://tampere-backend-97492ba9e80a.herokuapp.com/api/alerts`);
        const data = await response.json();
        const uniqueAlerts = Array.from(new Set(data.data.alerts.map(alert => alert.alertDescriptionText)));
        setAlerts(uniqueAlerts);
      } catch (error) {
        console.error('Error fetching alerts:', error);
      }
    };

    fetchAlerts();
  }, []);

  useEffect(() => {
    if (containerRef.current && tickerRef.current && alerts.length > 0) {
      const containerWidth = containerRef.current.offsetWidth;
      const animationSpeed = 1; // Adjust as needed for desired animation speed
      let startPos = containerWidth;

      const animate = () => {
        startPos -= animationSpeed;
        tickerRef.current.style.transform = `translateX(${startPos}px)`;

        if (startPos <= -tickerRef.current.offsetWidth) {
          setActiveAlertIndex(prevIndex => (prevIndex + 1) % alerts.length);
          startPos = containerWidth;
        }

        animationFrameRef.current = requestAnimationFrame(animate);
      };

      animationFrameRef.current = requestAnimationFrame(animate);

      return () => {
        cancelAnimationFrame(animationFrameRef.current);
      };
    }
  }, [alerts, activeAlertIndex]);

  const handleButtonClick = () => {
    setShowModal(!showModal);
  };

  if (alerts.length === 0) {
    return null; // Do not show alerts-container if no alerts are found
  }

  return (
    <div className="alerts-container">
      <div className="alerts-ticker-wrapper" ref={containerRef}>
        <div className="alerts-ticker" ref={tickerRef}>
          <img src={`${process.env.PUBLIC_URL}/icons/alert.png`} alt="alert icon" className="alert-icon" />
          {alerts[activeAlertIndex]}
        </div>
      </div>
      <div className="alerts-button" onClick={handleButtonClick}>
        {alerts.length}
      </div>
      {showModal && (
        <div className="alerts-modal">
          <div className="alerts-modal-content">
            {alerts.map((alert, index) => (
              <div key={index} className="alert-item">
                <table>
                  <tbody>
                    <tr>
                      <td>
                        <img src={`${process.env.PUBLIC_URL}/icons/alert.png`} alt="alert icon" className="alert-icon-modal" />
                      </td>
                      <td>{alert}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}
            <button className="close-button" onClick={handleButtonClick}>Sulje</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Alerts;
