#!/bin/bash

# InChronicle Service Management Script
# Usage: ./manage-services.sh [start|stop|restart|status|logs] [service]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to get service command
get_service_command() {
    case $1 in
        "frontend") echo "npm run dev" ;;
        "backend") echo "cd backend && npm run dev" ;;
        "prisma-studio") echo "cd backend && npm run db:studio" ;;
        "build-backend") echo "cd backend && npm run build" ;;
        "build-frontend") echo "npm run build" ;;
        *) echo "" ;;
    esac
}

# Function to get service port
get_service_port() {
    case $1 in
        "frontend") echo "5173" ;;
        "backend") echo "3002" ;;
        "prisma-studio") echo "5555" ;;
        *) echo "" ;;
    esac
}

# Function to get service process pattern
get_service_process() {
    case $1 in
        "frontend") echo "vite" ;;
        "backend") echo "tsx.*src/app.ts" ;;
        "prisma-studio") echo "prisma studio" ;;
        *) echo "" ;;
    esac
}

# Function to check if a service is running
check_service() {
    local service=$1
    local port=$(get_service_port $service)
    local process=$(get_service_process $service)
    
    if [ -n "$port" ]; then
        if lsof -ti:$port > /dev/null 2>&1; then
            local pid=$(lsof -ti:$port)
            print_status $GREEN "✓ $service is running (PID: $pid, Port: $port)"
            return 0
        fi
    fi
    
    if [ -n "$process" ]; then
        if pgrep -f "$process" > /dev/null 2>&1; then
            local pid=$(pgrep -f "$process")
            print_status $GREEN "✓ $service is running (PID: $pid)"
            return 0
        fi
    fi
    
    print_status $RED "✗ $service is not running"
    return 1
}

# Function to start a service
start_service() {
    local service=$1
    local command=$(get_service_command $service)
    
    if [ -z "$command" ]; then
        print_status $RED "Unknown service: $service"
        return 1
    fi
    
    if check_service $service > /dev/null 2>&1; then
        print_status $YELLOW "$service is already running"
        return 0
    fi
    
    print_status $BLUE "Starting $service..."
    
    # Create a detached process
    case $service in
        "frontend")
            nohup npm run dev > frontend.log 2>&1 &
            ;;
        "backend")
            cd "$BACKEND_DIR"
            nohup npm run dev > ../backend.log 2>&1 &
            cd "$SCRIPT_DIR"
            ;;
        "prisma-studio")
            cd "$BACKEND_DIR"
            nohup npm run db:studio > prisma-studio.log 2>&1 &
            cd "$SCRIPT_DIR"
            ;;
        *)
            nohup $command > ${service}.log 2>&1 &
            ;;
    esac
    
    sleep 3
    if check_service $service > /dev/null 2>&1; then
        print_status $GREEN "✓ $service started successfully"
    else
        print_status $RED "✗ Failed to start $service"
        return 1
    fi
}

# Function to stop a service
stop_service() {
    local service=$1
    local process=$(get_service_process $service)
    local port=$(get_service_port $service)
    
    print_status $BLUE "Stopping $service..."
    
    # First try to kill by port
    if [ -n "$port" ]; then
        local pid=$(lsof -ti:$port 2>/dev/null)
        if [ -n "$pid" ]; then
            kill $pid 2>/dev/null
            sleep 2
        fi
    fi
    
    # Then try to kill by process name
    if [ -n "$process" ]; then
        pkill -f "$process" 2>/dev/null
        sleep 2
    fi
    
    # Force kill if still running
    if check_service $service > /dev/null 2>&1; then
        if [ -n "$port" ]; then
            local pid=$(lsof -ti:$port 2>/dev/null)
            if [ -n "$pid" ]; then
                kill -9 $pid 2>/dev/null
            fi
        fi
        if [ -n "$process" ]; then
            pkill -9 -f "$process" 2>/dev/null
        fi
    fi
    
    sleep 1
    if ! check_service $service > /dev/null 2>&1; then
        print_status $GREEN "✓ $service stopped successfully"
    else
        print_status $RED "✗ Failed to stop $service"
        return 1
    fi
}

# Function to restart a service
restart_service() {
    local service=$1
    print_status $BLUE "Restarting $service..."
    stop_service $service
    sleep 2
    start_service $service
}

# Function to show service status
show_status() {
    print_status $BLUE "=== Service Status ==="
    
    for service in frontend backend prisma-studio; do
        check_service $service
    done
    
    echo
    print_status $BLUE "=== System Information ==="
    echo "Node.js version: $(node --version 2>/dev/null || echo 'Not found')"
    echo "npm version: $(npm --version 2>/dev/null || echo 'Not found')"
    echo "Working directory: $SCRIPT_DIR"
    
    # Check database connection (if backend is running)
    if check_service "backend" > /dev/null 2>&1; then
        echo "Backend health: $(curl -s http://localhost:3002/health | grep -o '"status":"[^"]*"' | cut -d'"' -f4 2>/dev/null || echo 'Unknown')"
    fi
}

# Function to show logs
show_logs() {
    local service=$1
    local lines=${2:-50}
    
    case $service in
        "frontend")
            if [ -f "frontend.log" ]; then
                print_status $BLUE "=== Frontend Logs (last $lines lines) ==="
                tail -n $lines frontend.log
            else
                print_status $RED "No frontend log file found"
            fi
            ;;
        "backend")
            if [ -f "backend.log" ]; then
                print_status $BLUE "=== Backend Logs (last $lines lines) ==="
                tail -n $lines backend.log
            elif [ -f "$BACKEND_DIR/logs/combined.log" ]; then
                print_status $BLUE "=== Backend Logs (last $lines lines) ==="
                tail -n $lines "$BACKEND_DIR/logs/combined.log"
            else
                print_status $RED "No backend log file found"
            fi
            ;;
        "prisma-studio")
            if [ -f "$BACKEND_DIR/prisma-studio.log" ]; then
                print_status $BLUE "=== Prisma Studio Logs (last $lines lines) ==="
                tail -n $lines "$BACKEND_DIR/prisma-studio.log"
            else
                print_status $RED "No Prisma Studio log file found"
            fi
            ;;
        *)
            print_status $RED "Unknown service for logs: $service"
            ;;
    esac
}

# Function to show help
show_help() {
    echo "InChronicle Service Management Script"
    echo
    echo "Usage: $0 [COMMAND] [SERVICE] [OPTIONS]"
    echo
    echo "Commands:"
    echo "  start [service]     Start a service or all services"
    echo "  stop [service]      Stop a service or all services"
    echo "  restart [service]   Restart a service or all services"
    echo "  status              Show status of all services"
    echo "  logs [service]      Show logs for a service"
    echo "  help                Show this help message"
    echo
    echo "Services:"
    echo "  frontend            React/Vite frontend (port 5173)"
    echo "  backend             Node.js/Express backend (port 3002)"
    echo "  prisma-studio       Prisma database browser (port 5555)"
    echo
    echo "Examples:"
    echo "  $0 start frontend        # Start only the frontend"
    echo "  $0 start                 # Start all services"
    echo "  $0 restart backend       # Restart the backend"
    echo "  $0 logs backend          # Show backend logs"
    echo "  $0 status                # Show status of all services"
}

# Main script logic
case $1 in
    "start")
        if [ -n "$2" ]; then
            start_service $2
        else
            print_status $BLUE "Starting all services..."
            for service in frontend backend; do
                start_service $service
            done
        fi
        ;;
    "stop")
        if [ -n "$2" ]; then
            stop_service $2
        else
            print_status $BLUE "Stopping all services..."
            for service in frontend backend prisma-studio; do
                stop_service $service
            done
        fi
        ;;
    "restart")
        if [ -n "$2" ]; then
            restart_service $2
        else
            print_status $BLUE "Restarting all services..."
            for service in frontend backend; do
                restart_service $service
            done
        fi
        ;;
    "status")
        show_status
        ;;
    "logs")
        if [ -n "$2" ]; then
            show_logs $2 $3
        else
            print_status $RED "Please specify a service for logs"
            echo "Available services: frontend, backend, prisma-studio"
        fi
        ;;
    "help"|"--help"|"-h")
        show_help
        ;;
    *)
        print_status $RED "Unknown command: $1"
        echo
        show_help
        exit 1
        ;;
esac