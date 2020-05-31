### PROJECT DESCRIPTION - Shaped by Motion

Sports are goal and performance oriented. We often forget about the beauty and poetic perspective of these movements. 
I want to capture the essence of these motions and accompanying sounds, which are mastered for perfection and reinterpret them through abstract art.

#### CREATING AN ABSTRACT SPORT VISUALISATION

The idea is to generate a visualisation of several sport disciplines by recording specific data with a smart watch. Data sources are <a href="https://www.hindawi.com/journals/js/2019/6514520/">motion sensors</a> such as accelerometer, gyroscope, and magnetometer, which are basic components of most smart devices. Additionally, the sound of the respective sport was recorded with the internal microphone.

The selected sports are skating, bouldering and swimming. Each sport was captured by athletes wearing a smartwatch. 

The captured data is processed by developing fitting algorithms, which enable an artistic visualisation. This is done with the help of libraries such as <a href="https://threejs.org/">three.js</a> and <a href="https://d3js.org/">d3.js</a>. The generated visuals are not an obvious simulation of the respective sport, but rather an abstract and creative interpretation. However, each visual representation has a connection to its data source. The use of fitting colors, textures, sound atmospheres and recognisable patterns links the visualisation to each sport.

The visualisation can be explored by navigating around the virtual space, blending in and out the different data sources and switching between the sport disciplines.

Aside from this website, the generated visualisations can be used as a design for print on sports gear or posters.

Website Link:
https://abstractsportsviz.herokuapp.com/

---
### WORST CASE
INPUT
- research and assesment of prerecorded data
- two sports
- one data source (e.g. motion tracking with 2-3 features position, acceleration, rotation)
- concept of data source seperation (possibility for interaction in BEST case)

OUTPUT
- no interaction 
- the visualisation is animated, but might jitter slightly
- basic represantation of sport (e.g. fitting color)
- still frames from animation for product design (e.g. gear/shirt with with abstract “climbing” illustration)
- visual understanding of input features (no beautification)

### BEST CASE
INPUT
- recording the data input myself 
- various data sources (e.g. motion tracking, sound, pulse)
- recording at least two sports (e.g. climbing, skating, dancing, etc.)

OUTPUT
- viewer can interact with visualisation (e.g. blending in/out data sources, switch/compare between sports)
- the abstract visualisation is a smooth animation
- more complex representation of sport (e.g. recognisable pattern typical for a particular sport)
- beautification of input features
---
### TIMING
![](img/Zeitplan.png)

#### NOVEMBER
- concept finalisation
- moodboard
- research for prerecorded mocap data, sound data, pulse,..
- test out visualisation in p5.js
- search for tracking devices

#### DECEMBER
- create workflow
- test out visualisation in p5.js
- style testing
- search for tracking devices

#### JANUARY 
- decide on visual style
- recording the data input myself 

#### FEBRUARY
- platform/website for final product
- polishing animation

#### MARCH
- interaction with visualisation 
- beautification of input features
- still frames from animation for product design
- preperation for presentation

#### APRIL
Finish 🎊
