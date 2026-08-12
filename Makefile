# Omega AI v29.1.0 - Makefile

.PHONY: install test lint format clean docker run shell docs

install:
	pip install -r requirements.txt

test:
	pytest -xvs tests/

lint:
	flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
	pylint --disable=all --enable=E,F .

format:
	black . --line-length 100
	isort . --profile black

clean:
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	rm -rf build/ dist/ *.egg-info/ .pytest_cache/ .coverage htmlcov/

docker:
	docker build -t omega-ai:latest .

docker-run:
	docker run -p 8000:8000 --env-file .env omega-ai:latest

run:
	python api_server.py

shell:
	python -c "from omega_ai import *; print('Shell ready')"

docs:
	pdoc --html --output-dir docs/ .

backup:
	python auto_backup.py

migrate:
	python db_migrations.py

health:
	curl -s http://localhost:8000/health | python -m json.tool
