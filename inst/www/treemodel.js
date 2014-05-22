    
       
        var TreeModel = Backbone.Model.extend({
            defaults: {
                tree: [],
            }
        });   
    
        var TreeView = Backbone.View.extend({
            initialize: function(){
                // listeners for model->view binding
             	this.model.on('change', this.render, this);      
            },            

            // jquery listeners for view->model binding
            events: {
//                'click .tree-node' : function(e){  
//                    this.$el.tree('beginEdit', e.target);
//                },

            },

//            template: _.template("<ul id='tt' class='easyui-tree' data-options='data: <%= JSON.stringify(tree) %>' ></ul>"),  
            
            render: function() {    
//                this.$el.html(this.template(this.model.attributes));
                var model = this.model; 
                
                this.$el.tree({
                                onClick: function(node){
                                    $(this).tree('beginEdit', node.target);
                                },
                                onAfterEdit: function(node){
                                    var root = $(this).tree('getRoot');
                                    var data = $(this).tree('getData', root.target);
                                    model.set('tree', [data]);
                                }
                              });
                
                this.$el.tree('loadData', this.model.get('tree'));
                return this;
        	}
            
        });

        
        var treeModel = new TreeModel(); 
    
        treeModel.fetch({
                         url:'tree_data3.json', 
                         success: function(){ console.log("tree loaded"); },
                         error: function(model, response, options){ console.log("error loading tree"); },
                        });
        
        var treeView = new TreeView({
                                    model: treeModel,
                                    el: $("#tt") 
                                    });

        
     
    
    