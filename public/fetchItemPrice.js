if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(showPosition);
} else {
  document.getElementById("demo").innerHTML = "Geolocation is not supported by this browser.";
}

function showPosition(position) {
  document.getElementById("demo").innerHTML =
    "Latitude: " + position.coords.latitude + "<br>" +
    "Longitude: " + position.coords.longitude + "<br>" +
    getItemPrice("aa");
}

function getItemPrice(name) {
  const max = 20;
  const min = 1;
  return (Math.random() * (max - min) + min).toFixed(2);
}