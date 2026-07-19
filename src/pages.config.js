/**
 * pages.config.js - Configuration du routing.
 *
 * Source unique des routes : App.jsx génère une <Route> pour chaque entrée de
 * PAGES ci-dessous. Pour ajouter une page : crée le fichier dans ./pages/,
 * importe-le ici et ajoute-le à l'objet PAGES (la clé = le chemin de l'URL).
 *
 * mainPage : la page affichée à la racine "/".
 *
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AllWorks from './pages/AllWorks';
import Home from './pages/Home';
import InProgress from './pages/InProgress';
import Priority from './pages/Priority';
import Watched from './pages/Watched';
import WorkDetail from './pages/WorkDetail';
import NotReleased from './pages/NotReleased';
import WantToWatch from './pages/WantToWatch';
import Audit from './pages/Audit';
import Enrichissement from './pages/Enrichissement';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AllWorks": AllWorks,
    "Home": Home,
    "InProgress": InProgress,
    "Priority": Priority,
    "Watched": Watched,
    "WorkDetail": WorkDetail,
    "NotReleased": NotReleased,
    "WantToWatch": WantToWatch,
    "Audit": Audit,
    "Enrichissement": Enrichissement,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};