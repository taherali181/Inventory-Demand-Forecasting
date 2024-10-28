Inventory Forecasting Application

Overview

This project is an Inventory Forecasting Application developed using Python, FastAPI, and machine learning techniques. The goal is to forecast inventory levels using historical sales data and provide a chatbot interface for user interaction. The application features a web-based frontend for ease of use.

Project Structure

The project is organized into the following directory structure:

inventory_forecasting_app/
├── main.py  # Entry point for FastAPI application
├── chatbot.py  # Chatbot interface implementation
├── forecasting.py  # Forecasting logic implementation
├── data_processing.py  # Data upload and validation functions
├── eda.py  # Exploratory Data Analysis implementation
├── requirements.txt  # Dependencies list
├── README.md  # Documentation
├── tests/  # Unit tests
├── data/  # Folder to store sample CSV files
└── frontend/  # Frontend implementation

Features

Data Upload and Processing:

Users can upload a CSV file containing historical sales data.

The application validates the uploaded file to ensure it follows the expected format.

Forecasting Logic:

Implements both basic and advanced forecasting techniques.

Uses a simple moving average for short-term forecasts and RandomForestRegressor for more advanced forecasting.

Chatbot Interface:

A conversational chatbot is implemented to assist users in navigating the application.

Users can ask questions related to data upload, forecast parameters, and general help.

Frontend Implementation:

A simple web-based frontend is created using HTML, CSS, and JavaScript.

Users can upload files, get forecasts, and interact with the chatbot through the frontend.

Error Handling:

Error handling is implemented for data upload, user input validation, and chatbot interactions to ensure a smooth user experience.

Deployment:

The application can be deployed on a cloud service like Heroku or any FastAPI-compatible platform.

Testing:

Unit tests are provided to validate each component of the application.

Installation

Clone the repository:

`git clone <repository_url>
cd inventory_forecasting_app`

Install dependencies:

pip install -r requirements.txt

Run the FastAPI application:

uvicorn main:app --reload

Access the Frontend:

Open your browser and navigate to http://127.0.0.1:8000/frontend/index.html to use the web interface.

Usage

Upload Sales Data

Use the /upload endpoint to upload a CSV file containing historical sales data.

The file should contain columns such as date, store, item, and sales.

Get Forecast

Use the /forecast endpoint to get inventory forecasts based on the uploaded data.

The application provides both a moving average forecast and an advanced machine learning-based forecast.

Chatbot Assistance

Use the /chatbot/chat/{user_input} endpoint to interact with the chatbot for help regarding the application.

Frontend

A simple frontend is provided to facilitate user interaction.

Users can upload data, request forecasts, and interact with the chatbot through a web interface.

Testing

Unit tests are included to validate the forecasting logic and other components:

Requirements

The requirements.txt file should include the following dependencies:

fastapi
uvicorn
pandas
numpy
scikit-learn
matplotlib
seaborn
holidays

License

This project is licensed under the MIT License. Feel free to use and modify it.

Contact

For any questions or suggestions, please contact [your_email@example.com].

