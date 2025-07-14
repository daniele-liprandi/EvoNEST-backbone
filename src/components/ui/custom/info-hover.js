import React, { useState } from 'react';
import { IoIosInformationCircleOutline } from "react-icons/io";
import './InfoHover.css';


const InfoHover = ({ text }) => {
  const [showInfo, setShowInfo] = useState(false);

  
  return (
    <div className="info-hover">
      <span
        className="info-icon"
        onMouseEnter={() => setShowInfo(true)}
        onMouseLeave={() => setShowInfo(false)}
      ><IoIosInformationCircleOutline />
      </span>
      {showInfo && <div className="info-text">{text}</div>}
    </div>
  );
};

export default InfoHover;
