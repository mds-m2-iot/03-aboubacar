// =====================================================================
//  Ma plante connectee · simulation reseau et MQTT (seance 3)
//  Module M2 Applications mobiles et connectees (IoT) · Sergent.dev
// =====================================================================
//
//  Ce que fait ce programme :
//    il reprend le projet de la seance 1, y ajoute le WiFi et publie
//    ses mesures sur un broker MQTT public. C'est la meme chaine que
//    sur le kit reel, sans le kit.
//
//  A quoi il sert en cours :
//    - un binome dont la carte est en panne continue le TP de la
//      seance 3 sans materiel,
//    - il permet de montrer les sujets et les charges utiles au tableau
//      avant de distribuer les kits,
//    - il sert de secours le jour des portes ouvertes si une carte lache.
//
//  Le broker est celui du module, sur son serveur en ligne. Il est
//  chiffre et il demande un compte : celui de la classe, ecrit au
//  tableau. Une plante simulee apparait donc sur le mur des plantes
//  comme une vraie, ce qui est tout l'interet du secours.
//
//  Le mot de passe n'est pas ecrit dans ce fichier, qui est publie sur
//  wokwi.com : il se colle au moment de la manipulation. Un secret dans
//  un fichier partage n'est plus un secret, et c'est le sujet de la
//  seance 5.
//
//  Wokwi ne simule pas le Bluetooth. Ce programme ne fait donc que la
//  moitie de ce que fait le firmware du kit, et c'est assume.
// =====================================================================

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHT.h>

// --------------------------------------------------------- broches
#define PIN_HUMIDITE  34
#define PIN_LUMIERE   35
#define PIN_DHT       25
#define PIN_SDA       21
#define PIN_SCL       22

// ------------------------------------------------------------ reseau
// Wokwi fournit un point d'acces virtuel nomme Wokwi-GUEST, sans mot de
// passe. Il n'existe que dans le simulateur : sur le vrai kit, ces deux
// lignes prennent le nom et le mot de passe du reseau du projet.
#define WIFI_SSID       "Wokwi-GUEST"
#define WIFI_MOTDEPASSE ""

// Le broker du module. Meme nom, meme port et meme compte que sur le
// kit reel : la simulation n'est pas un montage a part, c'est le meme
// chemin avec une carte virtuelle.
#define MQTT_HOTE        "mqtt.plante-hub.sergent.dev"
#define MQTT_PORT        8883
#define MQTT_UTILISATEUR "classe"

// A REMPLIR avant de lancer, avec le mot de passe ecrit au tableau.
// Il ne doit pas revenir dans le depot.
#define MQTT_MOTDEPASSE  ""

// Change ce prefixe pour celui de ton binome, sinon tes mesures se
// melangent a celles d'un inconnu sans qu'aucune erreur ne s'affiche.
#define ID_BINOME  "binome-00"

// ----------------------------------------------------- calibration
// Bornes propres a la simulation, differentes de celles du kit reel :
// dans Wokwi le potentiometre couvre toute la plage, et la
// photoresistance monte avec la lumiere, a l'inverse du module LM393.
#define SIM_SOL_SEC     4095
#define SIM_SOL_HUMIDE  0
#define SIM_LUM_SOMBRE  0
#define SIM_LUM_CLAIR   4095

#define SEUIL_BAS   30
#define SEUIL_HAUT  70
#define PERIODE_MESURE_MS 2000

// Liaison chiffree. setInsecure() est appele dans setup() : la carte
// chiffre mais ne verifie pas a qui elle parle. C'est le meme choix que
// le firmware du kit en seances 3 a 5, et c'est le sujet de la seance 6.
WiFiClientSecure clientReseau;
PubSubClient mqtt(clientReseau);
DHT dht(PIN_DHT, DHT22);
Adafruit_SSD1306 ecran(128, 64, &Wire, -1);
bool ecranPresent = false;

String prefixe = String("plante/") + ID_BINOME;
unsigned long derniereMesure = 0;
unsigned long dernierEssai = 0;
unsigned long delaiEssai = 2000;   // double a chaque echec, plafonne a 30 s

// ---------------------------------------------------------------------
//  Fonctions de calcul, identiques a celles du firmware du kit.
// ---------------------------------------------------------------------
float versPourcentage(int brut, int borneBasse, int borneHaute) {
  if (borneBasse == borneHaute) return 0.0f;
  float pct = (float)(borneBasse - brut) * 100.0f / (float)(borneBasse - borneHaute);
  if (pct < 0.0f)   pct = 0.0f;
  if (pct > 100.0f) pct = 100.0f;
  return pct;
}

const char* nomHumeur(float humidite) {
  if (humidite > SEUIL_HAUT + 15) return "noyee";
  if (humidite > SEUIL_HAUT)      return "reput";
  if (humidite < SEUIL_BAS - 15)  return "assoiffee";
  if (humidite < SEUIL_BAS)       return "soif";
  return "heureuse";
}

int lireMoyenne(uint8_t broche) {
  long somme = 0;
  for (int i = 0; i < 3; i++) { somme += analogRead(broche); delay(4); }
  return (int)(somme / 3);
}

// ---------------------------------------------------------------------
//  Reception des commandes envoyees sur plante/<id>/cmd.
//  Une seule action est gardee dans la simulation : identifier, qui
//  ecrit une ligne dans la console. Sur le kit reel, elle fait clignoter
//  la LED pour retrouver sa carte au milieu de six autres.
// ---------------------------------------------------------------------
void surMessage(char* sujet, byte* charge, unsigned int taille) {
  JsonDocument doc;
  if (deserializeJson(doc, charge, taille)) {
    Serial.println("[ERR ] commande illisible");
    return;
  }
  const char* action = doc["action"] | "";
  Serial.printf("[MQTT] commande recue sur %s · action %s\n", sujet, action);
}

// ---------------------------------------------------------------------
//  Connexion au broker, avec testament et message retenu.
//  Le testament est enregistre AUPRES DU BROKER au moment de la
//  connexion : c'est lui qui le publiera si la carte se tait, parce
//  qu'une carte debranchee ne peut pas annoncer sa disparition.
// ---------------------------------------------------------------------
void connecterMqtt() {
  String idClient = String("plante-wokwi-") + String((uint32_t)ESP.getEfuseMac(), HEX);
  String sujetStatut = prefixe + "/statut";
  const char* testament = "{\"en_ligne\":false}";

  Serial.printf("[MQTT] connexion a %s\n", MQTT_HOTE);
  if (mqtt.connect(idClient.c_str(), MQTT_UTILISATEUR, MQTT_MOTDEPASSE,
                   sujetStatut.c_str(), 1, true, testament)) {
    Serial.printf("[MQTT] connecte · %s\n", prefixe.c_str());
    mqtt.subscribe((prefixe + "/cmd").c_str(), 1);

    // Message retenu : le prochain abonne recoit l'etat sans attendre,
    // au lieu d'un ecran vide pendant deux secondes.
    JsonDocument doc;
    doc["en_ligne"] = true;
    doc["nom"]      = "Plante simulee";
    doc["version"]  = "1.0.0-wokwi";
    doc["mode"]     = "simulation";
    doc["ip"]       = WiFi.localIP().toString();
    String s; serializeJson(doc, s);
    mqtt.publish(sujetStatut.c_str(), s.c_str(), true);
  } else {
    Serial.printf("[ERR ] MQTT refuse · code %d\n", mqtt.state());
  }
}

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\n[BOOT] Plante simulee · seance 3 · WiFi et MQTT");

  pinMode(PIN_HUMIDITE, INPUT);
  pinMode(PIN_LUMIERE, INPUT);
  dht.begin();

  Wire.begin(PIN_SDA, PIN_SCL);
  ecranPresent = ecran.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  if (!ecranPresent) Serial.println("[ERR ] ecran OLED absent · on continue sans");

  Serial.printf("[WIFI] connexion a %s\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_MOTDEPASSE);
  while (WiFi.status() != WL_CONNECTED) { delay(200); Serial.print("."); }
  Serial.printf("\n[WIFI] connecte · %s\n", WiFi.localIP().toString().c_str());

  // Sans setInsecure(), la poignee de main TLS echoue : la carte n'a
  // aucune autorite de certification en memoire.
  clientReseau.setInsecure();

  mqtt.setServer(MQTT_HOTE, MQTT_PORT);
  mqtt.setBufferSize(512);
  mqtt.setCallback(surMessage);
  connecterMqtt();
}

void loop() {
  // Reconnexion avec temporisation exponentielle : reessayer en boucle
  // saturerait le broker et, sur un vrai objet, viderait la batterie.
  if (!mqtt.connected()) {
    if (millis() - dernierEssai > delaiEssai) {
      dernierEssai = millis();
      connecterMqtt();
      delaiEssai = min(delaiEssai * 2, 30000UL);
    }
  } else {
    delaiEssai = 2000;
    mqtt.loop();
  }

  unsigned long maintenant = millis();
  if (maintenant - derniereMesure < PERIODE_MESURE_MS) return;
  derniereMesure = maintenant;

  int brutSol = lireMoyenne(PIN_HUMIDITE);
  int brutLum = lireMoyenne(PIN_LUMIERE);
  float humidite = versPourcentage(brutSol, SIM_SOL_SEC, SIM_SOL_HUMIDE);
  float lumiere  = versPourcentage(brutLum, SIM_LUM_SOMBRE, SIM_LUM_CLAIR);

  static float dernierT = 20.0f, dernierH = 50.0f;
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (!isnan(t) && !isnan(h)) { dernierT = t; dernierH = h; }

  const char* humeur = nomHumeur(humidite);
  Serial.printf("[MES ] hum %.1f%% · temp %.1fC · lum %.1f%% · humeur %s\n",
                humidite, dernierT, lumiere, humeur);

  if (mqtt.connected()) {
    // Trois sujets simples pour les abonnements a joker, plus un objet
    // complet pour ceux qui veulent tout d'un coup. Aucun n'est retenu :
    // une mesure perimee de deux secondes n'a aucun interet.
    char buf[16];
    dtostrf(humidite, 0, 1, buf);  mqtt.publish((prefixe + "/humidite").c_str(), buf);
    dtostrf(dernierT, 0, 1, buf);  mqtt.publish((prefixe + "/temperature").c_str(), buf);
    dtostrf(lumiere, 0, 1, buf);   mqtt.publish((prefixe + "/lumiere").c_str(), buf);

    JsonDocument doc;
    doc["humidite"]     = roundf(humidite * 10) / 10;
    doc["temperature"]  = roundf(dernierT * 10) / 10;
    doc["lumiere"]      = roundf(lumiere * 10) / 10;
    doc["humidite_air"] = roundf(dernierH * 10) / 10;
    doc["humeur"]       = humeur;
    doc["uptime"]       = millis();
    doc["version"]      = "1.0.0-wokwi";
    String charge; serializeJson(doc, charge);
    mqtt.publish((prefixe + "/mesures").c_str(), charge.c_str());
  }

  if (!ecranPresent) return;
  ecran.clearDisplay();
  ecran.setTextSize(1);
  ecran.setCursor(0, 0);
  ecran.print(mqtt.connected() ? "reseau ok" : "hors ligne");
  ecran.setTextSize(2);
  ecran.setCursor(0, 16);
  ecran.print((int)humidite); ecran.print("%");
  ecran.setTextSize(1);
  ecran.setCursor(64, 16); ecran.print(dernierT, 1); ecran.print("C");
  ecran.setCursor(64, 26); ecran.print((int)lumiere); ecran.print("% lum");
  ecran.setCursor(0, 46);  ecran.print(humeur);
  ecran.setCursor(0, 56);  ecran.print(prefixe);
  ecran.display();
}
