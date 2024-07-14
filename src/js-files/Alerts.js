import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import fi from 'date-fns/locale/fi'; // Import Finnish locale
import '../Alerts.css';

let openAlerts;
let closeAlerts;

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [activeAlertIndex, setActiveAlertIndex] = useState(0);
  const tickerRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await fetch(`https://data.itsfactory.fi/siriaccess/gm/json`);
        const data = await response.json();
        console.log(data);
        const uniqueAlerts = Array.from(new Set(data.Siri.ServiceDelivery.GeneralMessageDelivery[0].GeneralMessage.map(alert => alert.Content)));
        setAlerts(data.Siri.ServiceDelivery.GeneralMessageDelivery[0].GeneralMessage);
      } catch (error) {
        console.error('Error fetching alerts:', error);
      }
    };

    fetchAlerts();
  }, []);

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return format(date, 'd MMMM yyyy', { locale: fi });
  };

  openAlerts = () => setShowModal(true);
  closeAlerts = () => setShowModal(false);
 
  if (alerts.length === 0) {
    return null; // Do not show alerts-container if no alerts are found
  }

  return (
    <div className="alerts-container">
      {showModal && (
        <div className="alerts-modal">
          <h2>
            Muutokset liikenteessä
            <img src={`${process.env.PUBLIC_URL}/icons/arrow-right.svg`} alt="" className="arrow-icon" />
          </h2>
          <div className="alerts-modal-content">
            {alerts.map((alert, index) => (
              <div key={index} className="alert-item">
                <table>
                  <tbody>
                    <tr>
                      <td>
                        {alert.Content}
                      </td>
                    </tr>
                    <tr>
                      <td className='modal-date'>
                        <img src={`${process.env.PUBLIC_URL}/icons/date.svg`} alt="aika" className="date-icon-modal" />
                        {formatDate(alert.RecordedAtTime)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export { openAlerts, closeAlerts };
export default Alerts;
