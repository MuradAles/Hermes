import React from 'react';
import { Entity } from 'resium';
import { Cartesian3, Color, Cartesian2 } from 'cesium';
import type { Flight } from '../../types';

interface AirportMarkersProps {
  flight: Flight;
}

export const AirportMarkers: React.FC<AirportMarkersProps> = ({ flight }) => {
  return (
    <>
      {/* Departure Airport */}
      <Entity
        position={Cartesian3.fromDegrees(
          flight.departure.lon,
          flight.departure.lat,
          0
        )}
        point={{
          pixelSize: 20,
          color: Color.GREEN,
          outlineColor: Color.WHITE,
          outlineWidth: 3
        }}
        label={{
          text: `${flight.departure.name}\n(${flight.departure.code})`,
          font: '14px sans-serif',
          fillColor: Color.WHITE,
          outlineColor: Color.BLACK,
          outlineWidth: 2,
          style: 1, // FILL_AND_OUTLINE
          verticalOrigin: 1, // BOTTOM
          pixelOffset: new Cartesian2(0, -30),
          showBackground: true,
          backgroundColor: Color.fromCssColorString('#10b981').withAlpha(0.9),
          padding: new Cartesian2(8, 6)
        }}
      />

      {/* Arrival Airport */}
      <Entity
        position={Cartesian3.fromDegrees(
          flight.arrival.lon,
          flight.arrival.lat,
          0
        )}
        point={{
          pixelSize: 20,
          color: Color.RED,
          outlineColor: Color.WHITE,
          outlineWidth: 3
        }}
        label={{
          text: `${flight.arrival.name}\n(${flight.arrival.code})`,
          font: '14px sans-serif',
          fillColor: Color.WHITE,
          outlineColor: Color.BLACK,
          outlineWidth: 2,
          style: 1, // FILL_AND_OUTLINE
          verticalOrigin: 1, // BOTTOM
          pixelOffset: new Cartesian2(0, -30),
          showBackground: true,
          backgroundColor: Color.fromCssColorString('#ef4444').withAlpha(0.9),
          padding: new Cartesian2(8, 6)
        }}
      />
    </>
  );
};

