using System.Web;
using System.Web.Mvc;
using System.Web.Routing;
using System.Configuration;

namespace Tileproxy
{

    public class tileproxy : HttpApplication
    {
        
        public static string SERVER = ConfigurationManager.AppSettings["SERVER"];

        public static string[] PORTS = ConfigurationManager.AppSettings["SERVER"].Split(',');
        public static byte[] BLANK_PNG = System.Convert.FromBase64String(ConfigurationManager.AppSettings["BLANK_PNG"]);

        public static byte[] BLANK_JPEG = System.Convert.FromBase64String(ConfigurationManager.AppSettings["BLANK_JPEG"]);

        public static void RegisterRoutes(RouteCollection routes)
        {
            routes.IgnoreRoute("{resource}.axd/{*pathInfo}");

            routes.MapRoute(
                "Tiles", // Route name
                "{service}/{z}/{x}/{y}.{format}", // URL with parameters
                new { controller = "Tile", action = "ProxyTile"} // Parameter defaults
            );

        }

        protected void Application_Start()
        {

            AreaRegistration.RegisterAllAreas();

            RegisterRoutes(RouteTable.Routes);
        }

        protected void Application_End()
        {
           
        }
    }
}