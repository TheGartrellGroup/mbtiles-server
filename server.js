var express = require("express"),
  app = express(),
  MBTiles = require('mbtiles'),
  p = require("path"),
  fs = require('fs');

// path to the mbtiles; default is the server.js directory
var tilesDir = "C:\\TILES";

var port = process.argv[2] || 4440;

// Set return header
function getContentType(t) {

  var header = {};

  // CORS
  header["Access-Control-Allow-Origin"] = "*";
  header["Access-Control-Allow-Headers"] = "Origin, X-Requested-With, Content-Type, Accept";

  // Cache
  //header["Cache-Control"] = "public, max-age=2592000";

  // request specific headers
  if (t === "png") {
    header["Content-Type"] = "image/png";
  }
  if (t === "jpg") {
    header["Content-Type"] = "image/jpeg";
  }
  if (t === "pbf") {
    header["Content-Type"] = "application/x-protobuf";
    header["Content-Encoding"] = "gzip";
  }

  return header;
}

// tile cannon
app.get('/:s/:z/:x/:y.:t', function(req, res) {

  new MBTiles(p.join(tilesDir, req.params.s + '.mbtiles'), function(err, mbtiles) {

    mbtiles.getTile(req.params.z, req.params.x, req.params.y, function(err, tile, headers) {
      
      if (err){

        if(err.toString().indexOf('Tile does not exist')>-1) {
        
          getESRIBundleTile(req.params.s, req.params.z, req.params.x, req.params.y, function(_err, tile) {

            if (_err) {
                switch(req.params.t.toUpperCase()){

                  case "PNG": //send a transparent PNG
                    var buf = new Buffer(BLANK_PNG, 'base64');
                    res.set({
                      "Content-Type": "image/png",
                      "Access-Control-Allow-Origin" : '*',
                      "Access-Control-Allow-Headers":"Origin, X-Requested-With, Content-Type, Accept"
                    });
                    res.status(200).send(buf);
                    break;
                    
                  case "JPG": //send a white JPG
                    var buf = new Buffer(BLANK_JPG, 'base64');
                    res.set({
                      "Content-Type": "image/jpg",
                      "Access-Control-Allow-Origin" : '*',
                      "Access-Control-Allow-Headers":"Origin, X-Requested-With, Content-Type, Accept"
                    });
                    res.status(200).send(buf);
                    break;

                  case "PBF": //send nothing
                    res.set({
                      "Content-Type": "application/x-protobuf",
                      "Access-Control-Allow-Origin" : '*',
                      "Access-Control-Allow-Headers":"Origin, X-Requested-With, Content-Type, Accept"
                    });
                    res.status(200).send();
                    break;
                }
            } else {

              res.set(getContentType(req.params.t));
              res.send(tile);
            }
          });

      } 
    } else {

        res.set(getContentType(req.params.t));
        res.send(tile);
      }

    });

    if (err) console.log("error opening database");
  });
});

// start up the server
console.log('Listening on port: ' + port);
app.listen(port);

function getESRIBundleTile(service, z, x, y, callback) {
  try{
    var zoom = "L" + ((z < 10) ? "0" + z : "" + z);

    var _qe = 1 << z;
    var _ne = (_qe > 128) ? 128 : _qe;

    var bundle_filename_col = parseInt(Math.floor(x / _ne) * _ne);
    var bundle_filename_row = parseInt(Math.floor(y / _ne) * _ne);

    var filename = Pad(bundle_filename_row.toString(16), z, "R") + Pad(bundle_filename_col.toString(16), z, "C");

    var bundlxFileName = tilesDir +'/' + service + "/" + zoom + "/" + filename + ".bundlx";
    var bundleFileName = tilesDir +'/' + service + "/" + zoom + "/" + filename + ".bundle";

    var col = x - bundle_filename_col;
    var row = y - bundle_filename_row;

    var index = 128 * (col - 0) + (row - 0);

    fs.open(bundlxFileName, 'r', function(err, fd) {

      if (err) callback(err);

      var buffer = new Buffer(5);

      fs.read(fd, buffer, 0, 5, 16 + 5 * index, function(err, bytesRead, buffer) {

        if(err)
          callback(err)

        var offset = (buffer[0] & 0xff) + (buffer[1] & 0xff) * 256 + (buffer[2] & 0xff) * 65536 + (buffer[3] & 0xff) * 16777216 + (buffer[4] & 0xff) * 4294967296;

        fs.open(bundleFileName, 'r', function(_err, _fd) {
          if (_err) callback(_err)

          var lengthBytes = new Buffer(4);

          fs.read(_fd, lengthBytes, 0, 4, offset, function(__err, bytesRead, ybuffer) {

            if (__err) callback(__err)

            var length = (lengthBytes[0] & 0xff) + (lengthBytes[1] & 0xff) * 256 + (lengthBytes[2] & 0xff) * 65536 + (lengthBytes[3] & 0xff) * 16777216;

            var result = new Buffer(length);

            try{

              fs.read(_fd, result, 0, length, offset + 4, function(___err, bytesRead, zbuffer) {

                if (___err) callback(___err);

                callback(null, zbuffer);
              })
            }catch(ex){
              callback(ex.message)
            }
          })
        })
      })
    })
  }catch(ex){
    callback(ex, null);
  }
}

function Pad(num, zoom, type) {
  var padding = ((zoom > 17 && type == "R") || (zoom > 18 && type == "C")) ? 5 : 4;

  while (num.length < padding) {
    num = "0" + num;

  }

  return type + num;
}

var BLANK_PNG = "iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAMAAABrrFhUAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAMAUExURQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAALMw9IgAAAEAdFJOU////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////wBT9wclAAAACXBIWXMAAA7DAAAOwwHHb6hkAAAAGXRFWHRTb2Z0d2FyZQBwYWludC5uZXQgNC4wLjEyQwRr7AAAAZpJREFUeF7t0CEBAAAMhMD1L/0ztIAzeG5yDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBaDaBa8gHbA2oPDvK8padyAAAAAElFTkSuQmCC";

var BLANK_JPG = "/9j/4AAQSkZJRgABAQEAYABgAAD/4QBoRXhpZgAATU0AKgAAAAgABAEaAAUAAAABAAAAPgEbAAUAAAABAAAARgEoAAMAAAABAAIAAAExAAIAAAARAAAATgAAAAAAAABgAAAAAQAAAGAAAAABcGFpbnQubmV0IDQuMC4xMgAA/9sAQwD//////////////////////////////////////////////////////////////////////////////////////9sAQwH//////////////////////////////////////////////////////////////////////////////////////8AAEQgBAAEAAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/aAAwDAQACEQMRAD8AkooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA//2Q==";
