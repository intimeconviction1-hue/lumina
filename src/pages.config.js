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
import { lazy } from 'react';
import __Layout from './Layout.jsx';

// Chargement à la demande (code-splitting) : chaque page est téléchargée
// seulement quand on y navigue → démarrage de l'app plus léger et rapide.
// La bascule est gérée par un <Suspense> dans Layout.jsx.
const AllWorks       = lazy(() => import('./pages/AllWorks'));
const Home           = lazy(() => import('./pages/Home'));
const InProgress     = lazy(() => import('./pages/InProgress'));
const Priority       = lazy(() => import('./pages/Priority'));
const Watched        = lazy(() => import('./pages/Watched'));
const WorkDetail     = lazy(() => import('./pages/WorkDetail'));
const NotReleased    = lazy(() => import('./pages/NotReleased'));
const WantToWatch    = lazy(() => import('./pages/WantToWatch'));
const Audit          = lazy(() => import('./pages/Audit'));
const Enrichissement = lazy(() => import('./pages/Enrichissement'));


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