time {
    # Define the number of processes to start
    n=10

    node clear_collection.js
    wait
    
    # Start n instances of the javascript script
    for i in $(seq 1 $n); do
        node user_creation_worker.js $i &
    done

    # Wait for all background processes to complete
    wait

    node verify_user_creation.js $n
    wait
}