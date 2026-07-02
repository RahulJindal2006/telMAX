/**
 * telMAX Support Centre - content data
 * ------------------------------------------------------------------
 * Structure:  product  ->  categories  ->  articles (Q & A)
 *
 * To add a question:  find the right product + category and add an
 *   object to its `articles` array: { q, a, keywords, popular }
 * - `q`        the question
 * - `a`        the answer (plain text; line breaks become paragraphs)
 * - `keywords` extra words the search should match on
 * - `popular`  true = featured as a "commonly asked" question
 *
 * Nothing else in the site needs to change when you edit this file.
 */

export const supportData = [
  /* ============================ INTERNET ============================ */
  {
    id: "internet",
    name: "Internet",
    icon: "optical-fiber",
    blurb: "MAXfibre pure fibre internet - speeds, connection and performance.",
    categories: [
      {
        id: "getting-started",
        name: "Getting Started",
        icon: "help",
        articles: [
          {
            q: "What areas does telMAX service?",
            a: "telMAX pure fibre internet is currently available in Stouffville, Brooklin, Newmarket, Richmond Hill, Aurora, Barrie and Markham. Our network is actively expanding across the Greater Toronto Area - enter your address on our website to check availability at your home.",
            keywords: ["service area", "coverage", "available", "availability", "location", "where", "city"],
            popular: true,
          },
          {
            q: "What internet speed do I need for my household?",
            a: "It depends on how many people and devices share your connection. As a general guide: around 250 Mbps suits light browsing and streaming; 500 Mbps to 1 Gbps comfortably covers a typical family; and 2 Gbps or higher is ideal for serious gamers or homes with 20+ connected devices. Because every MAXfibre plan is symmetrical, your upload speed is just as fast as your download.",
            keywords: ["how fast", "plan", "mbps", "gbps", "recommend", "which plan", "choose"],
            popular: true,
          },
          {
            q: "Do I need internet to get TV or Home Phone?",
            a: "Yes. telMAX TV and Home Phone are delivered over our fibre network, so they require an active MAXfibre internet plan. You can bundle all three services together and save on your monthly bill.",
            keywords: ["bundle", "tv", "phone", "require", "standalone", "without internet"],
          },
        ],
      },
      {
        id: "troubleshooting",
        name: "Troubleshooting",
        icon: "wrench",
        articles: [
          {
            q: "My internet keeps disconnecting or is slower than usual - what should I do?",
            a: "Start in the eero app, which can run diagnostics and detect many issues automatically. Then reboot your equipment in the right order: unplug the modem (fibre box / ONT) and your eero, wait about 10 to 15 seconds, plug the modem back in first, let it fully settle, then power the eero back on. Test again on a device connected by Ethernet to rule out WiFi interference. If the problem continues, contact telMAX support so we can check the line.",
            keywords: ["disconnect", "dropping", "slow", "lag", "buffering", "unstable", "keeps cutting out", "not working", "internet down", "no internet", "reboot", "restart"],
            popular: true,
          },
          {
            q: "The lights on my router are off - what does that mean?",
            a: "No lights usually means the device has lost power or been knocked offline, often after a power outage. Unplug the eero (and modem) for about 15 seconds, then plug them back in and wait a few minutes for them to fully restart. If the lights still don't return, check the outlet and power adapter, then contact support.",
            keywords: ["no lights", "lights off", "router dead", "power", "not turning on", "no power", "outage"],
            popular: true,
          },
          {
            q: "What do the light colours on my eero mean?",
            a: "As general eero guidance: a solid white light means everything is normal and connected. A red light means the eero can't reach the internet - reboot the fibre box (ONT) first, wait about two minutes, then reboot the eero. A flashing blue light means the eero is starting up, updating or broadcasting for setup, so give it a few minutes. No light at all usually means no power - check the cable and outlet. For the definitive guide for your equipment, use the eero app or contact telMAX support.",
            keywords: ["eero light", "led", "light colour", "white light", "red light", "blue light", "blinking", "what does the light mean", "status light"],
            popular: true,
          },
          {
            q: "The fibre box (ONT) has a red LOS or alarm light - what should I do?",
            a: "A red LOS (\"loss of signal\") or alarm light on your fibre box (ONT) points to a problem on the fibre line itself, not something a reboot at home will fix. Please contact telMAX support and let us know you're seeing an LOS or alarm light so we can investigate the connection to your home.",
            keywords: ["los", "loss of signal", "ont", "fibre box", "red alarm", "alarm light", "fibre light", "no signal"],
          },
          {
            q: "Why won't certain devices connect to my WiFi?",
            a: "Some devices - older phones, smart-home gear, security cameras, thermostats and appliances - don't support WiFi 6 or the 5 GHz band. In the eero app you can temporarily hide the 5 GHz band so these devices connect to 2.4 GHz instead. Once they're paired, you can switch the 5 GHz band back on.",
            keywords: ["device won't connect", "smart home", "camera", "thermostat", "2.4 ghz", "5 ghz", "wifi 6", "compatibility"],
          },
          {
            q: "My internet is completely down - how do I check for an outage?",
            a: "First reboot your modem and eero: unplug the modem, wait about 10 to 15 seconds, plug it back in, let it settle, then power the eero on. If the fibre box (ONT) shows a red LOS or alarm light, that's a fibre-side issue you can't fix at home. If neighbours are also affected, there may be a local outage. To confirm an outage or report one, contact telMAX support - our team monitors the network 24/7 and can give you the latest status and updates.",
            keywords: ["outage", "no internet", "internet down", "service down", "everything offline", "report outage", "check outage", "local outage"],
          },
        ],
      },
      {
        id: "speed-performance",
        name: "Speed & Performance",
        icon: "stopwatch",
        articles: [
          {
            q: "Why do my devices show different speeds than my plan?",
            a: "Measured speed varies for several reasons: a wired Ethernet connection is faster and steadier than WiFi; older devices have network adapters that cap out below your plan speed; distance from your eero and physical obstructions reduce WiFi performance; and other networks nearby can cause interference. For the truest reading, test on a modern device connected directly by Ethernet.",
            keywords: ["speed test", "slower than plan", "not getting full speed", "wired vs wifi", "why slow"],
            popular: true,
          },
          {
            q: "How do I run a speed test?",
            a: "The easiest way is the eero app, which runs a test from your network gateway and also performs automatic checks roughly every couple of weeks so you can track performance over time. For a device-level reading, use a wired connection and a reputable speed-test site.",
            keywords: ["speed test", "test my speed", "measure speed", "eero app"],
          },
        ],
      },
    ],
  },

  /* ============================== WIFI =============================== */
  {
    id: "wifi",
    name: "WiFi & eero",
    icon: "wifi",
    blurb: "Your eero mesh WiFi system - setup, coverage and features.",
    categories: [
      {
        id: "setup",
        name: "Setup & Equipment",
        icon: "configuration",
        articles: [
          {
            q: "Can I use my own router instead of the eero?",
            a: "It's possible, but telMAX recommends using the eero system we provide. It's tuned for our network, kept up to date automatically, and lets our support team help you far more effectively if something goes wrong. Personal routers can also miss out on security and performance features.",
            keywords: ["own router", "third party router", "replace eero", "bring my own"],
            popular: true,
          },
          {
            q: "How do I set up my eero?",
            a: "Download the eero app, create or sign in to your eero account, and follow the guided steps - it walks you through plugging in the gateway eero and adding any extra units. Place the gateway in a central, open spot. If you'd like a hand, telMAX technical support is happy to help.",
            keywords: ["set up eero", "install eero", "eero app", "first time setup", "configure"],
          },
        ],
      },
      {
        id: "coverage",
        name: "Coverage & Extenders",
        icon: "wifi",
        articles: [
          {
            q: "How do I improve WiFi coverage throughout my home?",
            a: "Place your main eero in an open area on the main floor, up off the floor and away from thick walls, metal and large appliances. Spread additional eero units evenly so each one is within good range of the next. Keep in mind older devices may also limit the speeds you see, even with strong coverage.",
            keywords: ["dead zone", "weak signal", "no signal upstairs", "coverage", "whole home", "wifi range", "extend"],
            popular: true,
          },
          {
            q: "Can I add extenders to expand my coverage?",
            a: "Yes. You can add extra eero units that work together as one seamless mesh network - ideal for larger homes or tricky layouts. Additional eero units are available for $8/month each. Contact telMAX support to add one to your account.",
            keywords: ["extender", "add eero", "more coverage", "mesh", "extra unit", "booster"],
          },
        ],
      },
      {
        id: "features",
        name: "Features & Controls",
        icon: "star",
        articles: [
          {
            q: "How do I set up parental controls?",
            a: "The eero app lets you create profiles for family members, group their devices, pause the internet on demand or on a schedule, and apply content filters. Open the app, create a profile, add the devices that belong to it, then manage screen time and filtering from that profile.",
            keywords: ["parental controls", "kids", "block websites", "screen time", "pause internet", "filter"],
            popular: true,
          },
          {
            q: "How do I run a speed test with the eero app?",
            a: "Open the eero app and look for the speed-test option on the main activity screen. The app tests the connection at your gateway and saves a history of results - and it also runs automatic tests about every two weeks so you can keep an eye on performance.",
            keywords: ["speed test", "eero app", "test wifi speed", "check speed"],
          },
        ],
      },
      {
        id: "troubleshooting",
        name: "Troubleshooting",
        icon: "wrench",
        articles: [
          {
            q: "My eero is offline or showing a red light - how do I fix it?",
            a: "A red light on the eero usually means it can't reach the internet. Reboot the fibre box (ONT) first: unplug it for about 10 to 15 seconds, plug it back in and wait roughly two minutes, then reboot the eero the same way. Check that the cable from the modem is firmly seated. If the gateway eero is fine but a satellite shows red, move it closer to another eero. If the fibre box shows a red LOS or alarm light, that's a line issue - contact support rather than continuing to reboot.",
            keywords: ["eero offline", "red light", "blinking", "eero not working", "no wifi", "wifi down", "led", "reboot eero", "los"],
            popular: true,
          },
          {
            q: "My WiFi is connected but there's no internet - what now?",
            a: "This points to the connection upstream of the eero rather than the WiFi itself. Reboot the modem first, then the eero. Test with a device wired directly to the modem if possible. If wired also fails, the issue is the line or a possible outage - contact telMAX support.",
            keywords: ["connected no internet", "wifi not working", "no internet access", "limited connectivity"],
          },
        ],
      },
    ],
  },

  /* ============================ TV & STREAMING ======================= */
  {
    id: "tv",
    name: "TV & Streaming",
    icon: "tv",
    blurb: "MAXview TV - the app, channels, recordings and devices.",
    categories: [
      {
        id: "getting-started",
        name: "Getting Started",
        icon: "help",
        articles: [
          {
            q: "How do I sign in to the telMAX TV app?",
            a: "Use the same login credentials as your My telMAX billing portal. If you haven't registered for My telMAX yet, set that up first and then sign in to the TV app with those details.",
            keywords: ["sign in", "login", "tv app login", "credentials", "password"],
            popular: true,
          },
          {
            q: "Do I have to take the telMAX TV box?",
            a: "No. The MAXview service also works on Amazon Fire TV Stick, Apple TV and devices with the Google Play Store, so you can stream without our set-top box. Note that Roku and web browsers are not supported.",
            keywords: ["tv box", "without box", "set top box", "firestick", "apple tv", "roku"],
          },
          {
            q: "What TV hardware does telMAX offer?",
            a: "telMAX provides the Amino 7x managed set-top box, which supports hundreds of channels and apps. Netflix is not available on the Amino box. If you have more than one TV, you can add extra Amino boxes for $8/month each - they share the same channels and recordings.",
            keywords: ["amino", "set top box", "hardware", "receiver", "multiple tvs", "second tv"],
          },
        ],
      },
      {
        id: "app-devices",
        name: "App & Devices",
        icon: "computer",
        articles: [
          {
            q: "Can I get the telMAX TV app on my phone or tablet?",
            a: "Yes. The MAXview TV app is available for Android and iOS, so you can watch live TV and your recordings on a phone or tablet, at home or on the go.",
            keywords: ["mobile app", "phone", "tablet", "android", "ios", "watch on phone"],
            popular: true,
          },
          {
            q: "Is my Smart TV compatible with the telMAX TV app?",
            a: "Your Smart TV is compatible if it includes the Google Play Store, which is where you'll download the MAXview app. TVs without Google Play can use a supported streaming device such as a Fire TV Stick or Apple TV instead.",
            keywords: ["smart tv", "compatible", "google play", "samsung", "lg", "android tv"],
          },
        ],
      },
      {
        id: "recording",
        name: "Recording & Catch-Up",
        icon: "play",
        articles: [
          {
            q: "How many hours of recording can I save?",
            a: "Your MAXview Cloud-PVR stores up to 50 hours of recordings per account. Recordings are kept in the cloud, so you can watch them from any of your signed-in devices.",
            keywords: ["recording hours", "pvr", "cloud pvr", "storage", "dvr", "record limit"],
            popular: true,
          },
          {
            q: "What is Catch-Up TV and how do I use it?",
            a: "Catch-Up TV lets you watch programs that have already aired without needing a recording. Open the TV guide, scroll back up to three days, and select a past program to play it.",
            keywords: ["catch up", "catch-up tv", "missed show", "rewind", "watch past"],
          },
          {
            q: "Why can't I record certain shows or movies?",
            a: "If specific programs can't be recorded, parental control settings are the most common cause. Contact telMAX support and we can review and adjust the parental controls on your account.",
            keywords: ["can't record", "recording blocked", "parental controls", "won't record"],
          },
          {
            q: "What happens to my recordings if a channel changes or is removed?",
            a: "If a channel is rebranded, your existing recordings stay available and scheduled recordings continue - though series recordings may need to be re-set manually. If a channel is removed, it disappears from your guide within a few days; previous recordings from it remain visible for up to six months but can no longer be played.",
            keywords: ["channel removed", "channel rebranded", "lost recordings", "recordings gone"],
          },
        ],
      },
      {
        id: "channels",
        name: "Channels & Packages",
        icon: "tv",
        articles: [
          {
            q: "How many channels are in each package?",
            a: "Channel counts depend on the MAXview package you choose - Basic, Essentials or Essentials+ - with premium add-ons available on top. See the TV & Streaming page for the current line-ups, or contact support for help picking a package.",
            keywords: ["how many channels", "package", "lineup", "channel count"],
          },
          {
            q: "Why can't I access all the channels in my guide?",
            a: "The guide may list channels that aren't part of your current package. You can only watch the channels included in your subscription. If you believe a channel should be available to you, contact telMAX support and we'll check your account.",
            keywords: ["can't access channel", "missing channels", "channel not available", "locked channel"],
          },
          {
            q: "How do I upgrade my TV package?",
            a: "Contact telMAX support and we can upgrade your TV services quickly - there's no need to swap equipment for most changes.",
            keywords: ["upgrade tv", "change package", "add channels", "more channels"],
          },
        ],
      },
      {
        id: "troubleshooting",
        name: "Troubleshooting",
        icon: "wrench",
        articles: [
          {
            q: "How do I fix common problems with the MAXview TV app?",
            a: "Work through these steps in order: 1) Restart the device the app runs on. 2) Make sure the MAXview app is updated to the latest version. 3) If it still misbehaves, clear the app's cache - on Android devices this is under Settings > Apps > MAXview > Storage > Clear Cache. 4) As a last step, uninstall and reinstall the app. If problems remain, contact support.",
            keywords: ["tv app not working", "app crashing", "app frozen", "clear cache", "reinstall", "maxview not working", "tv not working", "no picture", "app won't load"],
            popular: true,
          },
          {
            q: "My TV picture is frozen, black or buffering - what should I do?",
            a: "Restart your TV box or streaming device, and check that your internet connection is healthy (test another device). Buffering often points to a WiFi issue, so a wired connection to the TV box, or moving an eero closer, can help. If the picture problem continues across all channels, contact telMAX support.",
            keywords: ["frozen", "black screen", "buffering", "no picture", "pixelated", "tv not working", "channel won't load"],
          },
        ],
      },
    ],
  },

  /* ============================ HOME PHONE =========================== */
  {
    id: "home-phone",
    name: "Home Phone",
    icon: "phone-ring",
    blurb: "MAXtalk home phone - calling, features and number transfers.",
    categories: [
      {
        id: "getting-started",
        name: "Getting Started",
        icon: "help",
        articles: [
          {
            q: "Do I need my own phone?",
            a: "Yes - telMAX provides the home phone service, but you supply the handset. Because only one phone connects directly to the equipment, a wireless (cordless) home phone system is recommended so you can place handsets anywhere in your home.",
            keywords: ["handset", "do i need a phone", "cordless", "wireless phone", "equipment"],
            popular: true,
          },
          {
            q: "Where can I call - is it limited to Canada?",
            a: "The MAXtalk plan includes unlimited nationwide calling across Canada. MAXtalk Plus extends unlimited calling to the Continental United States as well. International calls to other countries are available at applicable per-minute rates.",
            keywords: ["calling area", "long distance", "usa", "international", "canada wide", "where can i call"],
          },
        ],
      },
      {
        id: "calling-features",
        name: "Calling Features & Star Codes",
        icon: "phone",
        articles: [
          {
            q: "How do I access my voicemail?",
            a: "Dial *98 from your telMAX home phone to manage your voicemail. From there you can listen to messages and set up your greeting and PIN.",
            keywords: ["voicemail", "messages", "*98", "check messages", "voice mail"],
            popular: true,
          },
          {
            q: "What are the home phone star codes?",
            a: "Star codes turn calling features on and off from your handset. Common codes include: *43 enable Call Waiting, *44 disable Call Waiting; *69 Last Call Return; *98 Voicemail management; *72 Call Forward All on/off, *90 Call Forward when Busy, *92 Call Forward on No Answer, *94 Call Forward when Out of Service; *78 enable Do Not Disturb, *79 disable Do Not Disturb; *77 block anonymous callers, *87 allow anonymous callers; *60 block selected callers, *59 allow selected callers. This list is a handy reference - for the definitive, up-to-date set of codes for your service, see the telMAX Star Codes guide or contact telMAX support.",
            keywords: ["star codes", "star code", "feature codes", "call forwarding", "call waiting", "do not disturb", "anonymous", "selective", "*72", "*98", "*69", "*77", "*60"],
            popular: true,
          },
          {
            q: "How do I set up call forwarding?",
            a: "To forward all calls, dial *72 followed by the destination number; dial *72 again to turn it off. You can also forward only when the line is busy (*90), when there's no answer (*92), or when the phone is out of service (*94).",
            keywords: ["call forwarding", "forward calls", "*72", "redirect calls"],
          },
        ],
      },
      {
        id: "number-transfer",
        name: "Number Transfers",
        icon: "line-bubble-message",
        articles: [
          {
            q: "How long does it take to transfer (port) my phone number?",
            a: "Transferring your existing number to telMAX - known as a port-in - typically takes 8 to 9 business days. Cancelling service with your previous provider usually takes another 2 to 4 business days.",
            keywords: ["port", "port-in", "transfer number", "keep my number", "how long"],
            popular: true,
          },
          {
            q: "How do I know when my old home phone service has been cancelled?",
            a: "You'll receive a confirmation email from telMAX once the transfer completes. After that, your previous provider will send instructions for returning any of their equipment.",
            keywords: ["old service cancelled", "previous provider", "confirmation", "equipment return"],
          },
        ],
      },
      {
        id: "troubleshooting",
        name: "Troubleshooting",
        icon: "wrench",
        articles: [
          {
            q: "There's no dial tone on my home phone - how do I fix it?",
            a: "Check that your phone cable is plugged into the POTS1 port on the modem (the black box). Reboot the modem by unplugging it for about 10 to 15 seconds and plugging it back in. If your service uses a Grandstream phone adapter, confirm its cables are secure too (not every install has one). If there's still no dial tone after rebooting, contact telMAX support.",
            keywords: ["no dial tone", "phone not working", "dead phone", "can't make calls", "pots1", "grandstream", "phone down"],
            popular: true,
          },
          {
            q: "Will 911 work during a power or internet outage?",
            a: "Your home phone is a VoIP service that works over your internet connection. That means 911 and other calling may be unavailable during a power outage or internet interruption. Please keep a charged mobile phone on hand as a backup for emergencies, and make sure the service address on your account is always current so emergency services can be directed to the right location. If you move or your address changes, let telMAX know right away.",
            keywords: ["911", "emergency", "power outage", "voip", "emergency calling", "safety", "backup", "service address"],
          },
        ],
      },
    ],
  },

  /* ========================= BILLING & ACCOUNT ======================= */
  {
    id: "account",
    name: "Billing & Account",
    icon: "credit-card",
    blurb: "My telMAX portal, payments, billing and account changes.",
    categories: [
      {
        id: "my-telmax",
        name: "My telMAX Portal",
        icon: "user-circle",
        articles: [
          {
            // TODO(verify): confirm the phone-balance IVR path ("press 4") against current telMAX phone menu.
            q: "How do I check my account balance?",
            a: "Sign in to your My telMAX account and your balance appears in the account summary. You can also call from the phone number on your account and press 4 to hear your balance.",
            keywords: ["balance", "how much do i owe", "account summary", "check bill"],
            popular: true,
          },
          {
            q: "How do I register for or sign in to My telMAX?",
            a: "My telMAX is your online account portal for billing, payments and service details. Use the My telMAX page on our website to register as a new customer or sign in. The same credentials also log you in to the telMAX TV app.",
            keywords: ["register", "sign in", "login", "create account", "portal", "my telmax"],
          },
        ],
      },
      {
        id: "payments",
        name: "Payments & Billing",
        icon: "credit-card",
        articles: [
          {
            q: "How do I update my payment information?",
            a: "Sign in to My telMAX to add or manage a credit card and set up payments online. For security, telMAX cannot accept or change credit card details over the phone.",
            keywords: ["update payment", "change credit card", "payment method", "card on file"],
            popular: true,
          },
          {
            q: "How do I pay my bill online?",
            a: "Sign in to My telMAX and use the billing section to make a payment. You can also manage saved cards and set up automatic payments there.",
            keywords: ["pay bill", "pay online", "make a payment", "billing portal"],
            popular: true,
          },
          {
            q: "How do I pay my bill over the phone?",
            a: "You can make a payment over the phone by calling 1-844-483-5629. Note that payment methods can't be added or changed by phone - use My telMAX for that.",
            keywords: ["pay by phone", "phone payment", "call to pay"],
          },
          {
            q: "How do I set up e-billing and automatic payments?",
            a: "Sign in to My telMAX to go paperless and turn on automatic payments. In the billing section you can view and download your invoices, save a credit card, and enable autopay so each bill is paid on time without you having to think about it. You can update or remove your saved payment method there at any time.",
            keywords: ["e-billing", "ebilling", "paperless", "autopay", "automatic payment", "auto pay", "recurring payment", "payment method", "credit card"],
            popular: true,
          },
          {
            q: "How do I change my billing cycle?",
            a: "Contact telMAX support by phone or email to request a change to your billing cycle and we'll help where possible.",
            keywords: ["billing cycle", "billing date", "change due date"],
          },
        ],
      },
      {
        id: "manage-account",
        name: "Manage Account",
        icon: "user-group",
        articles: [
          {
            q: "How do I add another authorized person to my account?",
            a: "For your security, authorized users are added by request. Contact telMAX support by phone or email and we'll add the person you'd like to authorize on your account.",
            keywords: ["authorized user", "add person", "spouse", "account access", "add user"],
            popular: true,
          },
          {
            q: "How do I upgrade my services?",
            a: "Contact telMAX support and we can upgrade your internet, TV or phone services quickly. Most upgrades don't require new equipment or a technician visit.",
            keywords: ["upgrade", "change plan", "add service", "more speed"],
          },
          {
            q: "I'm moving - how do I transfer my service to a new address?",
            a: "Get in touch with telMAX support as early as you can before your move. We'll check whether telMAX fibre is available at your new address, arrange installation there, and update your account, billing and home-phone service details. If you have home phone, keeping your service address current also keeps your 911 information accurate. Contact us at 1-844-483-5629 or support@telmax.com to get the move started.",
            keywords: ["moving", "move", "new address", "transfer service", "relocate", "moving home", "change address"],
            popular: true,
          },
        ],
      },
    ],
  },

  /* ========================== INSTALLATION =========================== */
  {
    id: "installation",
    name: "Installation",
    icon: "home",
    blurb: "Getting connected - before, during and after your install.",
    categories: [
      {
        id: "before",
        name: "Before Installation",
        icon: "document",
        articles: [
          {
            q: "How should I prepare for my installation?",
            a: "Before your appointment, make sure an adult will be home, clear access to where you'd like your equipment installed, and think about which rooms need the strongest WiFi. telMAX provides an installation preparation checklist that walks through everything step by step.",
            keywords: ["prepare", "before install", "installation day", "checklist", "get ready"],
            popular: true,
          },
        ],
      },
      {
        id: "during",
        name: "Installation Day",
        icon: "home",
        articles: [
          {
            q: "How is the internet installed in my home?",
            a: "A telMAX technician brings the pure fibre connection into your home, installs the equipment, and sets up your eero WiFi system. They'll confirm everything is working before they leave. The process is designed to be quick and stress-free.",
            keywords: ["how install", "install process", "technician visit", "fibre install"],
          },
        ],
      },
      {
        id: "after",
        name: "After Installation",
        icon: "wifi",
        articles: [
          {
            q: "How do I reconnect my devices after my new network is set up?",
            a: "Reconnect each device using your new WiFi name and password. If a device won't join - common with older gear or smart-home products - temporarily hide the 5 GHz band in the eero app so it connects on 2.4 GHz, then switch 5 GHz back on afterwards.",
            keywords: ["reconnect devices", "new network", "wifi password", "after install", "devices won't connect"],
            popular: true,
          },
          {
            q: "How do I contact the technical service department?",
            a: "telMAX technical support can be reached three ways: by phone at 905-233-7377 ext. 2, toll-free at 1-844-483-5629 ext. 2, or by email at support@telmax.com.",
            keywords: ["technical support", "contact tech", "help line", "phone number", "tech support"],
          },
        ],
      },
    ],
  },
];
