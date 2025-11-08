import React, { useMemo } from 'react';
import { Entity } from 'resium';
import { Cartesian3, Color, Cartesian2 } from 'cesium';
import type { Flight } from '../../types';

interface AirportMarkersProps {
  flight: Flight;
}

// Create a text image for airport code using canvas with stroke for visibility
function createAirportCodeImage(code: string, textColor: string): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  
  // Set canvas size - larger for better visibility
  canvas.width = 100;
  canvas.height = 50;
  
  // Draw text with stroke (outline) for better visibility
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Draw stroke (outline) first - black for contrast
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 6;
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.strokeText(code.toUpperCase(), canvas.width / 2, canvas.height / 2);
  
  // Draw fill text on top
  ctx.fillStyle = textColor;
  ctx.fillText(code.toUpperCase(), canvas.width / 2, canvas.height / 2);
  
  return canvas.toDataURL();
}

export const AirportMarkers: React.FC<AirportMarkersProps> = ({ flight }) => {
  // Create billboard images for airport codes with colored text and black stroke
  const departureImage = useMemo(
    () => createAirportCodeImage(flight.departure.code, '#10b981'), // Green text
    [flight.departure.code]
  );
  
  const arrivalImage = useMemo(
    () => createAirportCodeImage(flight.arrival.code, '#ef4444'), // Red text
    [flight.arrival.code]
  );

  return (
    <>
      {/* Departure Airport - Just the code text */}
      <Entity
        position={Cartesian3.fromDegrees(
          flight.departure.lon,
          flight.departure.lat,
          0
        )}
        billboard={{
          image: departureImage,
          scale: 1.0,
          verticalOrigin: 2, // CENTER
          disableDepthTestDistance: Number.POSITIVE_INFINITY, // Always visible
        }}
      />

      {/* Arrival Airport - Just the code text */}
      <Entity
        position={Cartesian3.fromDegrees(
          flight.arrival.lon,
          flight.arrival.lat,
          0
        )}
        billboard={{
          image: arrivalImage,
          scale: 1.0,
          verticalOrigin: 2, // CENTER
          disableDepthTestDistance: Number.POSITIVE_INFINITY, // Always visible
        }}
      />
    </>
  );
};

