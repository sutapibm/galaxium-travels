#!/bin/bash

# Galaxium Travels - Start Script
# Starts both backend and frontend servers

echo "🚀 Starting Galaxium Travels..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Python is installed
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    echo "❌ Python is not installed. Please install Python 3 first."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Pick a health-check command that works in Git Bash / Windows setups
if command -v curl &> /dev/null; then
    HTTP_CHECK_CMD="curl -s"
elif command -v powershell &> /dev/null; then
    HTTP_CHECK_CMD="powershell -Command \"try { (Invoke-WebRequest -UseBasicParsing %s).StatusCode | Out-Null; exit 0 } catch { exit 1 }\""
else
    echo "❌ Neither curl nor powershell is available for health checks."
    exit 1
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    if [ -n "$JAVA_PID" ]; then
        kill $BACKEND_PID $FRONTEND_PID $JAVA_PID 2>/dev/null
    else
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    fi
    rm -f booking_system_backend/backend.log inventory_hold_service/java.log
    exit 0
}

trap cleanup SIGINT SIGTERM

# Kill any existing processes on ports 8001, 5173, and 8080
EXISTING_BACKEND=$(lsof -ti :8001 2>/dev/null)
if [ -n "$EXISTING_BACKEND" ]; then
    echo "Stopping existing backend process on port 8001..."
    echo "$EXISTING_BACKEND" | xargs kill -9 2>/dev/null
    sleep 1
fi
EXISTING_FRONTEND=$(lsof -ti :5173 2>/dev/null)
if [ -n "$EXISTING_FRONTEND" ]; then
    echo "Stopping existing frontend process on port 5173..."
    echo "$EXISTING_FRONTEND" | xargs kill -9 2>/dev/null
    sleep 1
fi
EXISTING_JAVA=$(lsof -ti :8080 2>/dev/null)
if [ -n "$EXISTING_JAVA" ]; then
    echo "Stopping existing Java service process on port 8080..."
    echo "$EXISTING_JAVA" | xargs kill -9 2>/dev/null
    sleep 1
fi

# Start Backend
echo -e "${BLUE}📡 Starting Backend Server...${NC}"
cd booking_system_backend

# Check if virtual environment exists, create if not
if [ ! -d ".venv" ]; then
    echo "Creating Python virtual environment..."
    "$PYTHON_CMD" -m venv .venv
fi

# Activate virtual environment and install dependencies
if [ -f ".venv/Scripts/activate" ]; then
    source .venv/Scripts/activate
    VENV_PYTHON=".venv/Scripts/python.exe"
else
    source .venv/bin/activate
    VENV_PYTHON=".venv/bin/python"
fi
pip install -q -r requirements.txt

# Start backend server in background using venv Python
"$VENV_PYTHON" server.py > backend.log 2>&1 &
BACKEND_PID=$!

# Wait for backend to start and verify
sleep 5
if command -v curl &> /dev/null; then
    if ! curl -s http://localhost:8001/ > /dev/null 2>&1; then
        echo "❌ Backend failed to start. Check backend.log for errors:"
        cat backend.log
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
else
    if ! powershell -Command "try { (Invoke-WebRequest -UseBasicParsing http://localhost:8001/).StatusCode | Out-Null; exit 0 } catch { exit 1 }"; then
        echo "❌ Backend failed to start. Check backend.log for errors:"
        cat backend.log
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
fi

cd ..
echo -e "${GREEN}✅ Backend started on http://localhost:8001${NC}"
echo ""

# Start Java Hold Service (if it exists)
JAVA_PID=""
HOLD_SERVICE_DIR="inventory_hold_service"
if [ -d "$HOLD_SERVICE_DIR" ]; then
    HOLD_SERVICE_CMD=""
    HAS_POM="false"
    HAS_JAR="false"

    if [ -f "$HOLD_SERVICE_DIR/pom.xml" ]; then
        HAS_POM="true"
    fi

    for jar in "$HOLD_SERVICE_DIR"/target/*.jar; do
        if [ -f "$jar" ] && [[ "$jar" != *.original ]]; then
            HAS_JAR="true"
            if [ -z "$HOLD_SERVICE_CMD" ]; then
                HOLD_SERVICE_CMD="java -jar target/$(basename "$jar")"
            fi
        fi
    done

    if [ "$HAS_POM" = "true" ] && command -v mvn &> /dev/null; then
        HOLD_SERVICE_CMD="mvn -q spring-boot:run"
    elif [ "$HAS_POM" = "true" ] && [ "$HAS_JAR" = "false" ]; then
        echo "⚠️  Maven is not installed and no built Java Hold Service JAR was found in $HOLD_SERVICE_DIR/target."
        echo "⚠️  Install Maven or provide a built JAR to enable quote and hold flow."
        echo ""
    fi

    if [ -z "$HOLD_SERVICE_CMD" ]; then
        if [ "$HAS_POM" != "true" ] && [ "$HAS_JAR" != "true" ]; then
            echo "⚠️  Java Hold Service found, but no pom.xml or runnable JAR exists in $HOLD_SERVICE_DIR. Skipping..."
            echo ""
        fi
    elif ! command -v java &> /dev/null; then
        echo "⚠️  Java is not installed. Skipping Java Hold Service..."
        echo ""
    else
        echo -e "${BLUE}☕ Starting Java Hold Service...${NC}"
        cd "$HOLD_SERVICE_DIR"
        PYTHON_BACKEND_URL=http://localhost:8001 $HOLD_SERVICE_CMD > java.log 2>&1 &
        JAVA_PID=$!

        # Wait for Java service to start and verify
        sleep 12
        if command -v curl &> /dev/null; then
            if ! curl -s http://localhost:8080/api/v1/health > /dev/null 2>&1; then
                # Try alternate health paths as fallbacks
                if ! curl -s http://localhost:8080/actuator/health > /dev/null 2>&1; then
                    if ! curl -s http://localhost:8080/ > /dev/null 2>&1; then
                        echo "⚠️  Java Hold Service failed to start. Check $HOLD_SERVICE_DIR/java.log for errors:"
                        cat java.log
                        echo "⚠️  Continuing without Java Hold Service..."
                        JAVA_PID=""
                    fi
                fi
            fi
        else
            if ! powershell -Command "try { (Invoke-WebRequest -UseBasicParsing http://localhost:8080/api/v1/health).StatusCode | Out-Null; exit 0 } catch { exit 1 }"; then
                if ! powershell -Command "try { (Invoke-WebRequest -UseBasicParsing http://localhost:8080/actuator/health).StatusCode | Out-Null; exit 0 } catch { exit 1 }"; then
                    if ! powershell -Command "try { (Invoke-WebRequest -UseBasicParsing http://localhost:8080/).StatusCode | Out-Null; exit 0 } catch { exit 1 }"; then
                        echo "⚠️  Java Hold Service failed to start. Check $HOLD_SERVICE_DIR/java.log for errors:"
                        cat java.log
                        echo "⚠️  Continuing without Java Hold Service..."
                        JAVA_PID=""
                    fi
                fi
            fi
        fi

        cd ..
        if [ -n "$JAVA_PID" ]; then
            echo -e "${GREEN}✅ Java Hold Service started on http://localhost:8080${NC}"
        fi
        echo ""
    fi
else
    echo -e "${BLUE}ℹ️  Java Hold Service not found - skipping${NC}"
    echo ""
fi

# Start Frontend
echo -e "${BLUE}🎨 Starting Frontend Server...${NC}"
cd booking_system_frontend

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# Start frontend server in background
npm run dev &
FRONTEND_PID=$!
cd ..

echo -e "${GREEN}✅ Frontend started on http://localhost:5173${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌟 Galaxium Travels is running!"
echo ""
echo "   Backend:       http://localhost:8001"
echo "   Frontend:      http://localhost:5173"
echo "   API Docs:      http://localhost:8001/docs"
if [ -n "$JAVA_PID" ]; then
    echo "   Hold Service:  http://localhost:8080"
fi
echo ""
echo "Press Ctrl+C to stop all servers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Wait for all processes
if [ -n "$JAVA_PID" ]; then
    wait $BACKEND_PID $FRONTEND_PID $JAVA_PID
else
    wait $BACKEND_PID $FRONTEND_PID
fi

# Made with Bob
