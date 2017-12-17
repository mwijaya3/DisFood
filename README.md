# DisFood

1. DESCRIPTION

Our main visualization tool is a self-contained webpage that show relationship between food insecurity rate and disease prevalence.
Many layers such as risky areas, disease and food clusters, diabetes prevalence, obesity prevalence, and locate closest food pantries are visualized for users to fiddle and analyze with.

2. INSTALLATION

a) Obtain Google Maps APIs key:
- Go to the following link: https://developers.google.com/maps/documentation/android-api/signup
- Follow the instruction to obtain Google Maps APIs key

b) Input your Google Maps API key:
- Go to the following directory: CODE > Viz
- Edit index.html file your desire editor
- Go to line 21 and replace "Your_API_KEY" with Google Maps API key obtained in part a
- Save the file and exit


3. EXECUTION
User can execute the webpage using one of these two options:

a) Option 1: Localhost

Localhost is needed to launch the webpage, we recommend using localhost using Python.

Instruction to create a localhost via Python2 or Python3:
- Go to the following link: https://developer.mozilla.org/en-US/docs/Learn/Common_questions/set_up_a_local_testing_server
- Follow the instruction to create your localhost
- Open your command prompt (Windows)/terminal (OS X/Linux)
- Enter the following to check if Python is installed: python -V
- Navigate to the index.html directory using the "cd" command: cd CODE/Viz
- If Python version returned above is 3.X, enter the following on your command line: python -m http.server
- If Python version returned above is 2.X, enter the following on your command line: python -m SimpleHTTPServer

Load and Launch Visualization:
- Open web browser of your choice and enter this URL: localhost:8000
- If the visualization is not loaded, click the index.html file to run it

b) Option 2: No Localhost

- Launch the file: CODE > Viz > index.html using Mozilla Firefox browser, as this will allow user to launch the page without the need for a localhost.


---Instruction to scrape food pantries location (Not required to run the tool):
- Install Python3
- Install Scrapy: https://scrapy.org/
- Enter the following command on the command line: scrapy startproject pantries
- Type "cd pantries" at the folder path CODE > Viz > data
- Enter the following command: scrapy crawl pantries -t csv -o FoodPantries.csv --loglevel=INFO
- A file called "FoodPantries.csv" will be generated

---Instruction to get longitude and latitude (Not required to run the tool):
- Install Python3
- Install Geocoder library: https://pypi.python.org/pypi/geocoder
- Go to the directory: CODE > Viz > data > GeoMapping
- Run geocoder.py script to generate longitude and latitude of all food pantries

--Instruction on how to run algorithm results:
- Go to the following directory: CODE > Algo > README.txt
- Open the file README.md with editor of your choice and instruction is there

--Instruction on how to run Linear Regression Model using R:
- Install R (we recommend R Studio)
- Go to the following directory: Code > Children
- Compile and run the program
- output: scatter plot of children food insecurity against child-teen-death-rate and children overweight, and the linear regression model summary in the console.

4. Collaborators: Yi-Hsuan Hsieh, Luffina Huang, Lei Jiang, Keith Woh
