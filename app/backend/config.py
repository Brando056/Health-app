import os

# Base configuration class
class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your-secret-key'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///health_app.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False

# Development environment configuration
class DevelopmentConfig(Config):
    DEBUG = True

# Production environment configuration
class ProductionConfig(Config):
    DEBUG = False

# Configuration mapping
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
