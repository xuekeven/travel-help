'use client'

import { useCallback, useEffect, useState } from 'react'
import { AimOutlined } from '@ant-design/icons'
import { App, Button } from 'antd'
import {
  Circle,
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import type { LatLngBoundsExpression } from 'leaflet'
import type { PlaceCategory, TripPlace } from '@/types'

const CATEGORY_COLORS: Record<PlaceCategory, string> = {
  FOOD: '#ef6f55',
  ATTRACTION: '#1746a2',
  HOTEL: '#7b5ac8',
  TRANSPORT: '#23845f',
  SHOPPING: '#c57932',
  OTHER: '#68716b',
}

interface UserPosition {
  latitude: number
  longitude: number
  accuracy: number
}

function MapClickHandler({
  pickMode,
  onPick,
}: {
  pickMode: boolean
  onPick: (latitude: number, longitude: number) => void
}) {
  useMapEvents({
    click(event) {
      if (pickMode) onPick(event.latlng.lat, event.latlng.lng)
    },
  })
  return null
}

function FitPlaces({
  places,
  userPosition,
}: {
  places: TripPlace[]
  userPosition: UserPosition | null
}) {
  const map = useMap()

  useEffect(() => {
    if (userPosition || places.length === 0) return
    if (places.length === 1) {
      map.setView([places[0].latitude, places[0].longitude], 14)
      return
    }
    const bounds: LatLngBoundsExpression = places.map((place) => [place.latitude, place.longitude])
    map.fitBounds(bounds, { padding: [38, 38], maxZoom: 15 })
  }, [map, places, userPosition])

  return null
}

function LocateUser({
  requestId,
  onFound,
  onError,
}: {
  requestId: number
  onFound: (position: UserPosition) => void
  onError: (error: GeolocationPositionError | null) => void
}) {
  const map = useMap()

  useEffect(() => {
    if (!navigator.geolocation) {
      onError(null)
      return
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const position = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
        }
        onFound(position)
        map.setView([position.latitude, position.longitude], 15, { animate: true })
      },
      onError,
      {
        enableHighAccuracy: true,
        timeout: 12_000,
        maximumAge: 60_000,
      }
    )
  }, [map, onError, onFound, requestId])

  return null
}

function getLocationErrorMessage(error: GeolocationPositionError | null) {
  if (!error) return '当前浏览器不支持定位'
  if (error.code === error.PERMISSION_DENIED) return '定位权限未开启，请在浏览器地址栏中允许位置权限'
  if (error.code === error.POSITION_UNAVAILABLE) return '暂时无法获取当前位置，请检查设备定位服务'
  if (error.code === error.TIMEOUT) return '获取位置超时，请点击“定位我”重试'
  return '获取当前位置失败，请稍后重试'
}

export default function TripMap({
  places,
  pickMode,
  onPick,
}: {
  places: TripPlace[]
  pickMode: boolean
  onPick: (latitude: number, longitude: number) => void
}) {
  const { message } = App.useApp()
  const [requestId, setRequestId] = useState(0)
  const [locating, setLocating] = useState(true)
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null)

  const handleFound = useCallback((position: UserPosition) => {
    setUserPosition(position)
    setLocating(false)
  }, [])

  const handleError = useCallback((error: GeolocationPositionError | null) => {
    setLocating(false)
    message.warning(getLocationErrorMessage(error))
  }, [message])

  const locateAgain = () => {
    setLocating(true)
    setRequestId((current) => current + 1)
  }

  return (
    <div className="trip-map-shell">
      <MapContainer
        center={[35.8617, 104.1954]}
        zoom={4}
        scrollWheelZoom
        className={pickMode ? 'trip-map trip-map-picking' : 'trip-map'}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitPlaces places={places} userPosition={userPosition} />
        <LocateUser
          requestId={requestId}
          onFound={handleFound}
          onError={handleError}
        />
        <MapClickHandler pickMode={pickMode} onPick={onPick} />

        {userPosition && (
          <>
            <Circle
              center={[userPosition.latitude, userPosition.longitude]}
              radius={userPosition.accuracy}
              pathOptions={{
                color: '#1677ff',
                fillColor: '#1677ff',
                fillOpacity: 0.12,
                weight: 1,
              }}
            />
            <CircleMarker
              center={[userPosition.latitude, userPosition.longitude]}
              radius={8}
              pathOptions={{
                color: '#ffffff',
                weight: 3,
                fillColor: '#1677ff',
                fillOpacity: 1,
              }}
            >
              <Tooltip direction="top" offset={[0, -8]}>我的位置</Tooltip>
              <Popup>
                <strong>我的位置</strong>
                <br />
                定位精度约 {Math.round(userPosition.accuracy)} 米
              </Popup>
            </CircleMarker>
          </>
        )}

        {places.map((place) => (
          <CircleMarker
            key={place.id}
            center={[place.latitude, place.longitude]}
            radius={9}
            pathOptions={{
              color: '#fffaf2',
              weight: 3,
              fillColor: CATEGORY_COLORS[place.category],
              fillOpacity: 1,
            }}
          >
            <Tooltip direction="top" offset={[0, -8]}>{place.name}</Tooltip>
            <Popup>
              <strong>{place.name}</strong>
              <br />
              {place.city || place.address || '暂无地址'}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      <Button
        className="trip-map-locate"
        icon={<AimOutlined />}
        loading={locating}
        onClick={locateAgain}
      >
        定位我
      </Button>
    </div>
  )
}
