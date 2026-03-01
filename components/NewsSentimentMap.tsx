"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import Map, { useControl, type MapRef } from "react-map-gl";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { FlyToInterpolator } from "deck.gl";
import { ScatterplotLayer } from "deck.gl";
import type { Layer } from "deck.gl";
import { motion } from "framer-motion";
import { NewsPopup } from "./NewsPopup";
import SearchBar from "./SearchBar";
import TensionMeter, { type TensionMeterDatum } from "./TensionMeter";
import { TimelineSlider } from "./TimelineSlider";

const MAPBOX_DARK_STYLE = "mapbox://styles/mapbox/dark-v11";

/** One news event from Firestore /api/news (timestamp in ms) */
export interface NewsEvent {
  id: string;
  lat: number;
  lng: number;
  location_name?: string;
  sentiment_score: number;
  news_link?: string;
  timestamp?: number;
}

/** Deck.gl overlay that receives layers and syncs with Mapbox via useControl */
function DeckOverlay({
  layers,
  overlayRef,
}: {
  layers: Layer[];
  overlayRef: React.MutableRefObject<InstanceType<typeof MapboxOverlay> | null>;
}) {
  const overlay = useControl(() => new MapboxOverlay({ layers }));
  overlayRef.current = overlay;
  overlay.setProps({ layers });
  return null;
}

export function NewsSentimentMap() {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  const [allNewsData, setAllNewsData] = useState<NewsEvent[]>([]);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [minTime, setMinTime] = useState<number>(Date.now());
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<NewsEvent | null>(null);
  const [pulseRadius, setPulseRadius] = useState(0);
  const overlayRef = useRef<InstanceType<typeof MapboxOverlay> | null>(null);
  const mapRef = useRef<MapRef | null>(null);

  const [viewState, setViewState] = useState({
    longitude: 0,
    latitude: 20,
    zoom: 1.8,
    pitch: 0,
    bearing: 0,
  });

  // 4. The function that triggers the flat, 2D cinematic flight
  const flyToLocation = (lat: number, lng: number) => {
    setViewState({
      longitude: lng,
      latitude: lat,
      zoom: 5.5,
      pitch: 0, // Keeps the map completely flat/2D
      bearing: 0,
      transitionDuration: 3000,
      transitionInterpolator: new FlyToInterpolator(),
    } as typeof viewState & {
      transitionDuration: number;
      transitionInterpolator: FlyToInterpolator;
    });
    // React-map-gl Map doesn't animate from transitionInterpolator; use Mapbox flyTo for smooth 3s flight
    const map = mapRef.current?.getMap();
    if (map) {
      map.flyTo({
        center: [lng, lat],
        zoom: 5.5,
        pitch: 0,
        duration: 3000,
      });
    }
  };

  // Sonar animation: grow ring from 0 to 40,000 m then reset
  useEffect(() => {
    let animationId: number;
    const animate = () => {
      setPulseRadius((prev) => (prev > 40000 ? 0 : prev + 400));
      animationId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationId);
  }, []);

  useEffect(() => {
    fetch("/api/news")
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setAllNewsData(list);
        if (list.length > 0) {
          const timestamps = list
            .map((d) => d.timestamp)
            .filter((t): t is number => typeof t === "number");
          if (timestamps.length > 0) {
            setMinTime(Math.min(...timestamps));
            setCurrentTime(Math.max(...timestamps));
          }
        }
      })
      .catch(() => setAllNewsData([]))
      .finally(() => setLoading(false));
  }, []);

  const filteredData = useMemo(() => {
    return allNewsData.filter((d) => {
      const ts = d.timestamp;
      return typeof ts === "number" && ts <= currentTime;
    });
  }, [allNewsData, currentTime]);

  // Breaking news: events within 30 minutes of current slider time
  const breakingData = useMemo(() => {
    const THIRTY_MINUTES = 30 * 60 * 1000;
    return filteredData.filter(
      (d) =>
        typeof d.timestamp === "number" &&
        currentTime - d.timestamp <= THIRTY_MINUTES
    );
  }, [filteredData, currentTime]);

  const maxTime = useMemo(() => {
    if (allNewsData.length === 0) return Date.now();
    const timestamps = allNewsData
      .map((d) => d.timestamp)
      .filter((t): t is number => typeof t === "number");
    return timestamps.length > 0 ? Math.max(...timestamps) : Date.now();
  }, [allNewsData]);

  const layers = useMemo(
    () => [
      new ScatterplotLayer<NewsEvent>({
        id: "news-sentiment-scatter",
        data: filteredData,
        getPosition: (d) => [d.lng, d.lat],
        getFillColor: (d) =>
          d.sentiment_score < 0
            ? [255, 51, 102, 220] // Crimson
            : [0, 230, 118, 220], // Emerald
        getRadius: 15000,
        radiusMinPixels: 4,
        radiusMaxPixels: 28,
        radiusUnits: "meters",
        pickable: true,
        stroked: false,
        filled: true,
        transitions: {
          getFillColor: 300,
          getRadius: 300,
        },
      }),
      // Radar ping: expanding rings on breaking news only
      new ScatterplotLayer<NewsEvent>({
        id: "radar-ping-layer",
        data: breakingData,
        getPosition: (d) => [d.lng, d.lat],
        getFillColor: [0, 0, 0, 0],
        stroked: true,
        filled: true,
        getLineWidth: 2000,
        getLineColor: (d) => {
          const alpha = Math.max(
            0,
            Math.round(255 - (pulseRadius / 40000) * 255)
          );
          return d.sentiment_score < 0
            ? [255, 51, 102, alpha]
            : [0, 230, 118, alpha];
        },
        getRadius: pulseRadius,
        radiusUnits: "meters",
        updateTriggers: {
          getLineColor: [pulseRadius],
          getRadius: [pulseRadius],
        },
      }),
    ],
    [filteredData, breakingData, pulseRadius]
  );

  if (!mapboxToken) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background text-muted-foreground">
        <div className="max-w-md rounded-lg border border-border bg-card p-6 text-center">
          <p className="font-medium">Mapbox token required</p>
          <p className="mt-2 text-sm">
            Add <code className="rounded bg-muted px-1">NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN</code> to{" "}
            <code className="rounded bg-muted px-1">.env.local</code>
          </p>
        </div>
      </div>
    );
  }

  const handleMapClick = (e: { point: { x: number; y: number } }) => {
    const picked = overlayRef.current?.pickObject({
      x: e.point.x,
      y: e.point.y,
    });
    const obj = picked?.object as NewsEvent | undefined;
    if (obj?.id != null) setSelectedEvent(obj);
  };

  return (
    <div className="relative h-full w-full">
      <Map
        ref={mapRef}
        mapboxAccessToken={mapboxToken}
        {...viewState}
        onMove={(e) => setViewState(e.viewState)}
        style={{ width: "100%", height: "100%" }}
        mapStyle={MAPBOX_DARK_STYLE}
        attributionControl={true}
        onClick={handleMapClick}
      >
        <DeckOverlay layers={layers} overlayRef={overlayRef} />
      </Map>

      <TensionMeter data={filteredData as unknown as TensionMeterDatum[]} />
      <SearchBar onLocationFound={flyToLocation} />

      <NewsPopup
        selectedEvent={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />

      {allNewsData.length > 0 && (
        <TimelineSlider
          minTime={minTime}
          maxTime={maxTime}
          currentTime={currentTime}
          onChange={setCurrentTime}
        />
      )}

      {loading && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex flex-col items-center gap-4">
            <div
              className="h-12 w-12 animate-spin rounded-full border-2 border-muted border-t-positive-glow"
              style={{
                boxShadow: "0 0 20px rgba(0, 230, 118, 0.3)",
              }}
              aria-hidden
            />
            <p className="text-sm font-medium text-muted-foreground">
              Loading news events…
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
