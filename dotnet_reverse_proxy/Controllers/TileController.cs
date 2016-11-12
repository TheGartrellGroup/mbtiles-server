using System;
using System.IO;
using System.Web.Mvc;
using System.Net;

namespace Tileproxy.Controllers
{
    public class TileController : Controller
    {

        public ActionResult ProxyTile(string service, int x, int y, int z, string format)
        {
            //+ Randomize()
            var mbtiles_server_url = tileproxy.SERVER + ":"+GetPort()+"/" + service + "/" + z + "/" + x + "/" + y +"."+format;

            HttpWebRequest request = (HttpWebRequest)WebRequest.Create(mbtiles_server_url);

            HttpWebResponse response;
            try
            {
                response = (HttpWebResponse)request.GetResponse();
            }
            catch (WebException we)
            {
                //remote url not found, send 404 to client 
                if (format.ToUpper() == "JPG")
                {
                    return File(tileproxy.BLANK_PNG, "image/jpg");
                } else if (format.ToUpper() == "PNG") {
                    return File(tileproxy.BLANK_JPEG, "image/png");
                } else { //blank vector tile?
                    return File(new byte[0], "application / x - protobuf");
                }
            }

            Stream receiveStream = response.GetResponseStream();
            
            if(format.ToUpper() == "PBF")
            {
                Response.AddHeader("Content-Encoding", "gzip");
                return new FileStreamResult(receiveStream, "application / x - protobuf");
            } else {
                return new FileStreamResult(receiveStream, "image/"+format);
            }
        }

        public string GetPort()
        {
            var r = new Random();
            var num = r.Next(0,tileproxy.PORTS.Length);
            return tileproxy.PORTS[num];
        }
    }
}