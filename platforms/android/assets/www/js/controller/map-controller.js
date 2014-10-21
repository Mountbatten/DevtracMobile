var mapctlr = {

    // the Map object, default center and zoom settings
    MAP : null,

    DEFAULT_LAT :  null,
    DEFAULT_LNG : null,

    LOCATION : new L.Marker(new L.LatLng(0.28316, 32.45168), { clickable:false, draggable:false }),
    ACCURACY : new L.Circle(new L.LatLng(0.28316, 32.45168), 1),
    circle   : new L.CircleMarker(),

    DEFAULT_ZOOM : 15,

//  PLEASE USE YOUR OWN Mapbox layers if you use them
//  the "name" attribute is REQUIRED. it's not Leaflet standard, but is used by the cache system.
    BASEMAPS : {
      'terrain' : new L.TileLayer("http://{s}.tiles.mapbox.com/v3/greeninfo.map-fdff5ykx/{z}/{x}/{y}.jpg", { name:'Terrain', subdomains:['a','b','c','d'] }),

      'photo' : new L.TileLayer("http://{s}.tiles.mapbox.com/v3/greeninfo.map-zudfckcw/{z}/{x}/{y}.jpg", { name:'Photo', subdomains:['a','b','c','d'] }),

      'cloudmade' : new L.TileLayer('http://{s}.tile.cloudmade.com/0af1aa24ffb242768408f58d135a4382/997/256/{z}/{x}/{y}.png'),

      'mapbox' : new L.TileLayer("http://a.tiles.mapbox.com/v3/mapbox.world-light/{z}/{x}/{y}.png", { name:'World-light', subdomains:['a','b','c','d'] })
    },

//  PLEASE USE YOUR OWN Bing API key
//  used primarily by the geocoder

    BING_API_KEY : "AjBuYw8goYn_CWiqk65Rbf_Cm-j1QFPH-gGfOxjBipxuEB2N3n9yACKu5s8Dl18N",

//  a Marker indicating our last-known geolocation, and a Circle indicating accuracy
//  Our present latlng can be had from LOCATION..getLatLng(), a useful thing for doing distance calculations
    LOCATION_ICON : L.icon({
      iconUrl: 'img/marker-gps.png',
      iconSize:     [25, 41], // size of the icon
      iconAnchor:   [13, 41], // point of the icon which will correspond to marker's location
      popupAnchor:  [13, 1] // point from which the popup should open relative to the iconAnchor
    }),

//  should we automatically recenter the map when our location changes?
//  You can set this flag anywhere, but if there's also a checkbox toggle (there is) then also update it or else you'll confuse the user with a checkbox that's wrong
    AUTO_RECENTER : true,

    resizeMapIfVisible: function() {
      if (!  $("#map").is(':visible') ) return;

      var page    = $(":jqmData(role='page'):visible");
      var header  = $(":jqmData(role='header'):visible");
      var content = $(":jqmData(role='content'):visible");
      var viewportHeight = $(window).height();
      var contentHeight = viewportHeight - header.outerHeight();
      page.height(contentHeight + 1);
      $(":jqmData(role='content')").first().height(contentHeight);

      if ( $("#map").is(':visible') ) {
        $("#map").height(contentHeight);
        if (mapctlr.MAP) mapctlr.MAP.invalidateSize();
      }
    },

    initMap: function (lat, lon, loc, mapit) {
      mapctlr.LOCATION.circle = mapctlr.circle;
      
      if(lat != null && lon != null ){
        mapctlr.DEFAULT_LAT = lat; 
        mapctlr.DEFAULT_LNG = lon;
        
        mapctlr.LOCATION = new L.Marker(new L.LatLng(mapctlr.DEFAULT_LAT, mapctlr.DEFAULT_LNG), { clickable:false, draggable:false });
        mapctlr.ACCURACY = new L.Circle(new L.LatLng(mapctlr.DEFAULT_LAT, mapctlr.DEFAULT_LNG), 1);
      }

      if(!mapctlr.MAP) {
        // load the map and its initial view
        mapctlr.MAP = new L.Map('map', {
          attributionControl: true,
          zoomControl: true,
          dragging: true,
          closePopupOnClick: false,
          crs: L.CRS.EPSG3857
        });
        
        mapctlr.MAP.addLayer(mapctlr.BASEMAPS['cloudmade']);
      }

      if(loc) {
        $("#addlocation_back").show();
        $("#viewlocation_back").hide();
        
        mapctlr.MAP.addLayer(mapctlr.BASEMAPS['cloudmade']);
        
        $('#mapheader').html("");
        $('#mapheader').html("Add Location");
        mapctlr.MAP.removeLayer(mapctlr.LOCATION);
        mapctlr.MAP.removeLayer(mapctlr.ACCURACY);
        
        
        mapctlr.MAP.on('click', function(e) {
          mapctlr.MAP.removeLayer(mapctlr.LOCATION.circle);
          mapctlr.LOCATION.circle.setLatLng(e.latlng);
          mapctlr.LOCATION.circle.setRadius(4);
          mapctlr.LOCATION.circle.addTo(mapctlr.MAP);

          localStorage.latlon = e.latlng.lng+' '+e.latlng.lat;
          
          $("#location_latlon").val(localStorage.latlon);
          $("#map_district_error").html("");


        });
        
        mapctlr.MAP.setView(mapctlr.LOCATION.getLatLng(),11);
      } else if(mapit){
        
        mapctlr.MAP.removeEventListener('click');
        mapctlr.MAP.removeLayer(mapctlr.LOCATION.circle);
        mapctlr.MAP.removeLayer(mapctlr.LOCATION);
        $('#mapheader').html("");
        $('#mapheader').html("Map");
        
        $("#viewlocation_back").show();
        $("#addlocation_back").hide();
        

        $("#viewlocation_back").attr("class", "");
        $("#viewlocation_back").attr("class", "ui-btn-left");
        
        mapctlr.MAP.addLayer(mapctlr.BASEMAPS['mapbox']);
        mapctlr.LOCATION.addTo(mapctlr.MAP);
        
        mapctlr.MAP.setView(mapctlr.LOCATION.getLatLng(),11);
      }
    }

} 
