import os

# 基础配置类
class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your-secret-key'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///health_app.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False

# 开发环境配置
class DevelopmentConfig(Config):
    DEBUG = True

# 生产环境配置
class ProductionConfig(Config):
    DEBUG = False

# 配置映射
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}