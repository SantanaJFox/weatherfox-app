import React, {useState, useEffect, useRef} from 'react'
import './Weather.css'
import clear_icon from '../assets/clear.png'
import clear_night_icon from '../assets/clear_night.png'
import cloud_icon from '../assets/cloud.png'
import cloud_night_icon from '../assets/cloud_night.png'
import drizzle_icon from '../assets/drizzle.png'
import drizzle_night_icon from '../assets/drizzle_night.png'
import rain_icon from '../assets/rain.png'
import rain_night_icon from '../assets/rain_night.png'
import snow_icon from '../assets/snow.png'
import snow_night_icon from '../assets/snow_night.png'
import humidity_icon from '../assets/humidity.png'
import wind_icon from '../assets/wind.png'
import search_icon from '../assets/search.png'
import js from '@eslint/js'


const Weather = () => {

    const inputRef = useRef()

    const [weatherData, setWeatherData] = useState(null);

    const allIcons = {
        "01d": clear_icon,
        "01n": clear_night_icon,
        "02d": cloud_icon,
        "02n": cloud_night_icon,
        "03d": cloud_icon,
        "03n": cloud_night_icon,
        "04d": drizzle_icon,
        "04n": drizzle_night_icon,
        "09d": rain_icon,
        "09n": rain_night_icon,
        "10d": rain_icon,
        "10n": rain_night_icon,
        "13d": snow_icon,
        "13n": snow_night_icon,
    }

    const search = async (city) => {
        try {
            const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=imperial&appid=${import.meta.env.VITE_APP_ID}`

            const response = await fetch(url);

            const data = await response.json();

            if(!response.ok){
                alert(data.message);
                return;
            }

            console.log(data);
            
            const icon = allIcons[data.weather[0].icon] || clear_icon;

            setWeatherData({
                humidity: data.main.humidity,
                windSpeed: data.wind.speed,
                temperature: Math.floor(data.main.temp),
                high: Math.floor(data.main.temp_max),
                low: Math.floor(data.main.temp_min),
                description: data.weather?.[0]?.description ?? '',
                location: `${data.name}${data.sys?.country ? `, ${data.sys.country}` : ''}`,
                icon: icon,
            });

        } catch (error) {
            setWeatherData(false)
            console.error("Error in fetching weather data")
        }
    }

useEffect(()=>{
    search("Milwaukee");
},[])

  return (
    <div className="weather">
            <div className="search-bar">
                <input ref={inputRef} type="text" placeholder="Search" onKeyDown={(e) => { if (e.key === "Enter") { search(inputRef.current.value); }}}/>
                <img src={search_icon} alt="search" onClick={()=>search(inputRef.current.value)}/>
            </div>
        {weatherData?<>
        <img src={weatherData.icon} alt="" className="weather-icon" />
        <p className="temperature">{weatherData.temperature}°F</p>
        <p className="location">{weatherData.location}</p>
        <p className="description">{weatherData.description}</p>
        <p className="feelslike">Feels like {weatherData.feelsLike}°F</p>
        <div className="weather-data">
            <div className="col">
                <div>
                    <span>{weatherData.low}°F</span>
                    <span>Low</span>
                </div>
                <img src={humidity_icon} alt="" />
                <div>
                    <p>{weatherData.humidity}%</p>
                    <span>Humidity</span>
                </div>
            </div>
            <div className="col">
                <div>
                    <span>{weatherData.high}°F</span>
                    <span>High</span>
                </div>
                <img src={wind_icon} alt="" />
                <div>
                    <p>{weatherData.windSpeed} m/hr</p>
                    <span>Wind Speed</span>
                </div>
            </div>
        </div>
        </>:<></>}
    </div>
  )

}

export default Weather